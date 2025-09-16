"use client";
import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Play,
  Rocket,
  RotateCcw,
  Copy,
  Loader2,
  Download,
  SkipForward,
  Timer,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Tipos livianos
type NodeAny = {
  id: string;
  type: string;
  data: Record<string, any>;
};

type EdgeAny = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
};

type LogEntry =
  | { type: "user"; text: string; ts: number }
  | { type: "bot"; text: string; ts: number }
  | { type: "options"; text?: string; options: string[]; ts: number }
  | { type: "system"; text: string; ts: number };

type SimContext = { vars: Record<string, any> };

const now = () => Date.now();

const tpl = (text: string | undefined, ctx: SimContext) =>
  (text ?? "").replace(/\{\{\s*([\w.[\]0-9]+)\s*\}\}/g, (_m, key) => {
    // Permite nested keys: a.b.c
    try {
      const value = key
        .split(".")
        .reduce((acc: any, k: string) => (acc == null ? acc : acc[k]), ctx);
      return value == null ? "" : String(value);
    } catch {
      return "";
    }
  });

// Eval “segura” de condición: solo recibe `context`
const evalCondition = (expression: string, context: SimContext) => {
  // Prohíbe palabras peligrosas básicas
  if (/[;{}]|window|document|globalThis/g.test(expression)) {
    throw new Error("Expresión no permitida");
  }
  // Evalúa en función pura
  // eslint-disable-next-line no-new-func
  const fn = new Function("context", `return (!!(${expression}))`);
  return !!fn(context);
};

//eslint-disable-next-line
export function Simulator({
  nodes,
  edges,
}: {
  nodes: NodeAny[];
  edges: EdgeAny[];
}) {
  const [input, setInput] = useState("/start");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedNode, setPausedNode] = useState<NodeAny | null>(null);
  const [context, setContext] = useState<SimContext>({ vars: {} });
  const [ignoreDelays, setIgnoreDelays] = useState(false);
  const [stepMode, setStepMode] = useState(false);
  const [awaitingStep, setAwaitingStep] = useState(false);

  const logRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const idMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const outgoing = useMemo(() => {
    const map = new Map<string, EdgeAny[]>();
    edges.forEach((e) => {
      const arr = map.get(e.source) || [];
      arr.push(e);
      map.set(e.source, arr);
    });
    return map;
  }, [edges]);

  const addLog = useCallback((entry: Omit<LogEntry, "ts">) => {
    setLog((prev) => [...prev, { ...entry, ts: now() } as LogEntry]);
  }, []);

  // Autoscroll
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const wait = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

  const maybeStepPause = async () => {
    if (!stepMode) return;
    setAwaitingStep(true);
    // espera hasta que el usuario pulse "Step"
    await new Promise<void>((resolve) => {
      const check = () => {
        if (!mountedRef.current) return resolve();
        if (!awaitingStep) return resolve();
        setTimeout(check, 60);
      };
      check();
    });
  };

  const step = () => setAwaitingStep(false);

  const execute = useCallback(
    async (startNodeObj: NodeAny | string) => {
      let current: NodeAny | null =
        typeof startNodeObj === "string"
          ? idMap.get(startNodeObj) || null
          : startNodeObj;

      const visited = new Set<string>();
      let guard = 0;

      while (current && guard < 500) {
        // Step mode support
        await maybeStepPause();

        if (!mountedRef.current) return;
        guard++;

        // loop guard por id
        if (visited.has(current.id)) {
          addLog({ type: "system", text: "Error: Loop detected" });
          return;
        }
        visited.add(current.id);

        // Tipos
        if (current.type === "message") {
          const text = tpl(current.data?.text, context);
          addLog({ type: "bot", text });
        }

        if (current.type === "media") {
          const mt = (current.data?.mediaType || "").toString().toUpperCase();
          const url = tpl(current.data?.url, context);
          const caption = tpl(current.data?.caption, context);
          addLog({
            type: "bot",
            text: `[${mt || "MEDIA"}] ${url} ${caption || ""}`.trim(),
          });
        }

        if (current.type === "assign") {
          const key = current.data?.key as string;
          const rawValue = current.data?.value as string;
          if (key) {
            const value = tpl(rawValue, context);
            setContext((prev) => {
              const next = { vars: { ...prev.vars } };
              // Soporta keys tipo a.b.c
              key.split(".").reduce((acc, k, idx, arr) => {
                if (idx === arr.length - 1) acc[k] = value;
                else acc[k] = acc[k] ?? {};
                return acc[k];
              }, next.vars as any);
              return next;
            });
          }
        }

        if (current.type === "delay") {
          const seconds = Number(current.data?.seconds || 0);
          addLog({ type: "system", text: `⏱ Wait ${seconds}s` });
          if (!ignoreDelays && seconds > 0) {
            await wait(seconds * 1000);
          }
        }

        if (current.type === "options") {
          const opts = (current.data?.options || []) as string[];
          const text = tpl(current.data?.text, context);
          addLog({ type: "options", text, options: opts });
          setIsPaused(true);
          setPausedNode(current);
          return; // pausa hasta que el user responda
        }

        if (current.type === "api") {
          const method = String(current.data?.method || "GET").toUpperCase();
          const url = tpl(current.data?.url, context);
          const headers = current.data?.headers || {};
          const bodyRaw = current.data?.body || "";
          const assignTo = current.data?.assignTo || "apiResult";
          addLog({ type: "system", text: `Calling ${method} ${url}` });

          try {
            abortRef.current?.abort();
            abortRef.current = new AbortController();

            const init: RequestInit = {
              method,
              headers,
              signal: abortRef.current.signal,
            };
            if (method !== "GET" && method !== "HEAD") {
              init.body = tpl(bodyRaw, context);
            }

            const res = await fetch(url, init);
            const text = await res.text();
            let parsed: unknown = text;
            try {
              parsed = JSON.parse(text);
            } catch {
              // keep as text
            }

            setContext((prev) => ({
              vars: { ...prev.vars, [assignTo]: parsed },
            }));
            addLog({ type: "system", text: `Stored result in ${assignTo}` });
          } catch (e: any) {
            if (e?.name === "AbortError") {
              addLog({ type: "system", text: "API call aborted" });
            } else {
              addLog({ type: "system", text: `API error: ${String(e)}` });
            }
          }
        }

        if (current.type === "condition") {
          try {
            const res = evalCondition(
              String(current.data?.expression || "false"),
              context,
            );
            const edgesFrom = outgoing.get(current.id) || [];
            const edge = edgesFrom.find(
              (ed) => ed.sourceHandle === (res ? "true" : "false"),
            );
            current = edge ? idMap.get(edge.target) || null : null;
            continue;
          } catch (e) {
            addLog({ type: "system", text: `Condition error: ${String(e)}` });
          }
        }

        if (current.type === "goto") {
          const nextId = String(current.data?.targetNodeId || "");
          current = nextId ? idMap.get(nextId) || null : null;
          continue;
        }

        if (current.type === "end") {
          addLog({ type: "system", text: "🏁 End" });
          break;
        }

        // Siguiente por primera arista de salida
        const nextEdge = (outgoing.get(current.id) || [])[0];
        current = nextEdge ? idMap.get(nextEdge.target) || null : null;
      }

      if (guard >= 500) addLog({ type: "system", text: "Guard limit reached" });
    },
    [addLog, context, idMap, ignoreDelays, outgoing, stepMode],
  );

  const handleSendMessage = useCallback(
    async (message?: string) => {
      const messageToSend = (message ?? input).trim();
      if (isRunning || !messageToSend) return;

      setIsRunning(true);
      addLog({ type: "user", text: messageToSend });

      try {
        if (isPaused && pausedNode) {
          const userText = messageToSend.toLowerCase().trim();
          const opts: string[] = pausedNode.data?.options || [];
          const idx = opts.findIndex(
            (o) => o.toLowerCase().trim() === userText,
          );

          let nextNodeId: string | undefined;
          const edgesFrom = outgoing.get(pausedNode.id) || [];
          if (idx !== -1) {
            const handleId = `opt-${idx}`;
            const edge = edgesFrom.find((e) => e.sourceHandle === handleId);
            nextNodeId = edge?.target;
          } else {
            const edge = edgesFrom.find((e) => e.sourceHandle === "no-match");
            nextNodeId = edge?.target;
          }

          setIsPaused(false);
          setPausedNode(null);

          if (nextNodeId) {
            await execute(idMap.get(nextNodeId) || null);
          } else {
            addLog({ type: "system", text: "No path for this option." });
          }
        } else {
          // Reinicia contexto y busca trigger exacto (case-insensitive)
          setContext({ vars: {} });
          const msgLc = messageToSend.toLowerCase();
          const startNode = nodes.find(
            (n) =>
              n.type === "trigger" &&
              String(n.data?.keyword || "").toLowerCase() === msgLc,
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
    },
    [addLog, execute, idMap, input, isPaused, nodes, outgoing, pausedNode],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setLog([]);
    setIsPaused(false);
    setPausedNode(null);
    setContext({ vars: {} });
    setInput("/start");
    setAwaitingStep(false);
  }, []);

  const copyLog = useCallback(() => {
    const text = log
      .map((line) => {
        const prefix =
          line.type === "bot" ? "Bot: " : line.type === "user" ? "You: " : "";
        return `${new Date(line.ts).toLocaleTimeString()} ${prefix}${line.type === "options" ? line.text || "Options" : line.text}`;
      })
      .join("\n");
    navigator.clipboard.writeText(text);
  }, [log]);

  const downloadJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify({ log, context }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "simulation.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [log, context]);

  // Reset al cambiar grafo
  useEffect(() => {
    reset();
  }, [nodes, edges, reset]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-4 w-4" /> Simulador
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Panel de entrada */}
          <div className="col-span-2 space-y-2">
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

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => handleSendMessage()}
                disabled={isRunning || !input.trim()}
              >
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

              <Button
                variant="outline"
                onClick={downloadJSON}
                title="Descargar log y contexto"
              >
                <Download className="h-4 w-4 mr-2" />
                JSON
              </Button>

              <div className="flex items-center gap-2 ml-auto">
                <Timer className="h-4 w-4" />
                <Label htmlFor="ignore-delays" className="text-sm">
                  Ignorar delays
                </Label>
                {/*<Switch
                  id="ignore-delays"
                  checked={ignoreDelays}
                  onCheckedChange={setIgnoreDelays}
                />*/}
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="step-mode" className="text-sm">
                  Step
                </Label>
                {/*<Switch
                  id="step-mode"
                  checked={stepMode}
                  onCheckedChange={useCallback((v: boolean) => {
                    setStepMode(v);
                    setAwaitingStep(false);
                  }, [])}
                />*/}
                <Button
                  variant="outline"
                  disabled={!stepMode || !isRunning || !awaitingStep}
                  onClick={step}
                >
                  <SkipForward className="h-4 w-4 mr-2" />
                  Step
                </Button>
              </div>
            </div>

            <div
              ref={logRef}
              className="border rounded-lg p-3 h-[260px] overflow-auto bg-muted/30 space-y-2"
            >
              {log.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  Sin simulaciones. Presioná Iniciar.
                </div>
              )}
              {log.map((line, i) => (
                <div
                  key={i}
                  className={`text-sm ${line.type === "system" ? "text-muted-foreground" : ""}`}
                >
                  <span className="mr-2 text-[10px] text-muted-foreground">
                    {new Date(line.ts).toLocaleTimeString()}
                  </span>
                  {line.type === "bot"
                    ? "🤖 "
                    : line.type === "user"
                      ? "👤 "
                      : "• "}
                  {("text" in line && line.text) ||
                    (line.type === "options" && (line.text || "Opciones"))}
                  {line.type === "options" && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {line.options?.map((opt, j) => (
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
          </div>

          {/* Context Viewer */}
          <div className="col-span-1">
            <div className="border rounded-lg p-3 h-[260px] bg-muted/20 text-xs overflow-auto font-mono">
              <div className="font-semibold mb-2">Context (vars)</div>
              <pre>{JSON.stringify(context.vars, null, 2)}</pre>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
