import React, { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Play, Rocket, RotateCcw, Copy, Loader2 } from "lucide-react";

export function Simulator({ nodes, edges }) {
  const [input, setInput] = useState("/start");
  const [log, setLog] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedNode, setPausedNode] = useState(null);
  const [context, setContext] = useState({ vars: {} });
  const logRef = useRef<HTMLDivElement>(null);

  const idMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const outgoing = useMemo(() => {
    const map = new Map();
    edges.forEach((e) => {
      const arr = map.get(e.source) || [];
      arr.push(e);
      map.set(e.source, arr);
    });
    return map;
  }, [edges]);

  const addLog = (entry: { type: string; text: string; options?: string[] }) =>
    setLog((prev) => [...prev, entry]);

  const execute = async (startNode) => {
    let current = startNode;
    const visited = new Set();
    let guard = 0;
    while (current && guard < 200) {
      if (visited.has(current.id)) {
        addLog({ type: "system", text: "Error: Loop detected" });
        return;
      }
      visited.add(current.id);
      guard++;

      if (current.type === "message") {
        addLog({ type: "bot", text: current.data.text });
      }
      if (current.type === "media") {
        addLog({
          type: "bot",
          text: `[${current.data.mediaType.toUpperCase()}] ${current.data.url} ${current.data.caption || ""}`,
        });
      }
      if (current.type === "assign") {
        const newContext = { ...context, vars: { ...context.vars, [current.data.key]: current.data.value } };
        setContext(newContext);
      }
      if (current.type === "delay") {
        addLog({ type: "system", text: `⏱ Wait ${current.data.seconds}s` });
        await new Promise((r) =>
          setTimeout(r, (current.data.seconds || 0) * 1000),
        );
      }
      if (current.type === "options") {
        addLog({
          type: "options",
          text: current.data.text,
          options: current.data.options,
        });
        setIsPaused(true);
        setPausedNode(current);
        return;
      }
      if (current.type === "api") {
        addLog({
          type: "system",
          text: `Calling ${current.data.method} ${current.data.url}`,
        });
        try {
          const res = await fetch(current.data.url, {
            method: current.data.method,
            headers: current.data.headers,
            body:
              current.data.method !== "GET" ? current.data.body : undefined,
          });
          const text = await res.text();
          let parsed: unknown;
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = text;
          }
          const newContext = { ...context, vars: { ...context.vars, [current.data.assignTo]: parsed } };
          setContext(newContext);
          addLog({
            type: "system",
            text: `Stored result in ${current.data.assignTo}`,
          });
        } catch (e) {
          addLog({
            type: "system",
            text: `API error: ${String(e)}`,
          });
        }
      }
      if (current.type === "condition") {
        try {
          const fn = new Function(
            "context",
            `return (${current.data.expression})`,
          );
          const res = !!fn(context);
          const e = (outgoing.get(current.id) || []).find(
            (ed) => ed.sourceHandle === (res ? "true" : "false"),
          );
          current = e ? idMap.get(e.target) : null;
          continue;
        } catch (e) {
          addLog({
            type: "system",
            text: `Condition error: ${String(e)}`,
          });
        }
      }
      if (current.type === "goto") {
        current = idMap.get(current.data.targetNodeId);
        continue;
      }
      if (current.type === "end") {
        addLog({ type: "system", text: "🏁 End" });
        break;
      }

      const nextEdge = (outgoing.get(current.id) || [])[0];
      current = nextEdge ? idMap.get(nextEdge.target) : null;
    }
  };

  const handleSendMessage = async (message?: string) => {
    const messageToSend = message || input;
    if (isRunning || !messageToSend.trim()) return;
    setIsRunning(true);
    addLog({ type: "user", text: messageToSend });

    try {
      if (isPaused && pausedNode) {
        const optionIndex = pausedNode.data.options.findIndex(
          (opt) => opt.toLowerCase() === messageToSend.toLowerCase(),
        );

        let nextNodeId;
        if (optionIndex !== -1) {
          const sourceHandle = `opt-${optionIndex}`;
          const edge = (outgoing.get(pausedNode.id) || []).find(
            (e) => e.sourceHandle === sourceHandle,
          );
          nextNodeId = edge?.target;
        } else {
          const edge = (outgoing.get(pausedNode.id) || []).find(
            (e) => e.sourceHandle === "no-match",
          );
          nextNodeId = edge?.target;
        }

        setIsPaused(false);
        setPausedNode(null);

        if (nextNodeId) {
          await execute(idMap.get(nextNodeId));
        } else {
          addLog({ type: "system", text: "No path for this option." });
        }
      } else {
        setContext({ vars: {} });
        const startNode = nodes.find(
          (n) =>
            n.type === "trigger" &&
            n.data.keyword?.toLowerCase() === messageToSend.toLowerCase(),
        );

        if (startNode) {
          await execute(startNode);
        } else {
          addLog({ type: "system", text: "No trigger matches the input" });
        }
      }
    } finally {
      setInput("");
      setIsRunning(false);
    }
  };

  const reset = () => {
    setLog([]);
    setIsPaused(false);
    setPausedNode(null);
    setContext({ vars: {} });
    setInput("/start");
  };

  const copyLog = () => {
    const text = log
      .map((line) => {
        const prefix =
          line.type === "bot" ? "Bot: " : line.type === "user" ? "You: " : "";
        return `${prefix}${line.text}`;
      })
      .join("\n");
    navigator.clipboard.writeText(text);
  };

  useEffect(() => {
    reset();
  }, [nodes, edges]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-4 w-4" /> Simulador
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 flex-col">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSendMessage();
              }
            }}
            placeholder={isPaused ? "Escribe tu respuesta..." : "Hola"}
          />

          <div className="flex gap-2">
            <Button onClick={() => handleSendMessage()} disabled={isRunning || !input.trim()}>
              {isRunning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4 mr-2" />
              )}
              {isRunning ? "Ejecutando" : isPaused ? "Enviar" : "Iniciar"}
            </Button>
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
            <Button variant="outline" onClick={copyLog}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
          </div>
        </div>
        <div
          ref={logRef}
          className="border rounded-lg p-3 h-[260px] overflow-auto bg-muted/30 space-y-2"
        >
          {log.length === 0 && (
            <div className="text-sm text-muted-foreground">
              Sin simulaciones. Presiona Iniciar.
            </div>
          )}
          {log.map((line, i) => (
            <div
              key={i}
              className={`text-sm ${line.type === "system" ? "text-muted-foreground" : ""}`}
            >
              {line.type === "bot"
                ? "🤖 "
                : line.type === "user"
                  ? "👤 "
                  : "• "}
              {line.text}
              {line.type === 'options' && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {line.options.map((opt, j) => (
                    <Button
                      key={j}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendMessage(opt)}
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
