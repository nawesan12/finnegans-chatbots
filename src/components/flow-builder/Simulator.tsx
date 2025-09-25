"use client";
import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
import type {
  ApiNodeData,
  AssignNodeData,
  DelayNodeData,
  FlowEdge,
  FlowNode,
  OptionsNodeData,
  MessageNodeData,
  MediaNodeData,
  ConditionNodeData,
  GoToNodeData,
  HandoffNodeData,
  TriggerNodeData,
} from "./types";

type LogEntry =
  | { type: "user"; text: string; ts: number }
  | { type: "bot"; text: string; ts: number }
  | { type: "options"; text?: string; options: string[]; ts: number }
  | { type: "system"; text: string; ts: number };

type LogEntryInput =
  | { type: "user"; text: string }
  | { type: "bot"; text: string }
  | { type: "options"; text?: string; options: string[] }
  | { type: "system"; text: string };

type SimContext = { vars: Record<string, unknown> };

const now = () => Date.now();

const resolvePath = (source: unknown, segments: string[]): unknown =>
  segments.reduce<unknown>((acc, segment) => {
    if (acc == null) return acc;
    if (typeof acc !== "object") return undefined;
    const record = acc as Record<string, unknown>;
    return record[segment];
  }, source);

const tpl = (text: string | undefined, ctx: SimContext) =>
  (text ?? "").replace(/\{\{\s*([\w.[\]0-9]+)\s*\}\}/g, (_m, key) => {
    const value = resolvePath(ctx, key.split("."));
    return value == null ? "" : String(value);
  });

const setDeepValue = (
  target: Record<string, unknown>,
  path: string,
  value: unknown,
) => {
    const segments = path.split(".");
    let cursor: Record<string, unknown> = target;
    segments.forEach((segment, index) => {
      if (index === segments.length - 1) {
        cursor[segment] = value as unknown;
        return;
      }
      const existing = cursor[segment];
      if (typeof existing !== "object" || existing === null) {
        cursor[segment] = {};
      }
      cursor = cursor[segment] as Record<string, unknown>;
    });
  };

// Eval “segura” de condición: solo recibe `context`
const evalCondition = (expression: string, context: SimContext) => {
  // Prohíbe palabras peligrosas básicas
  if (/[;{}]|window|document|globalThis/g.test(expression)) {
    throw new Error("Expresión no permitida");
  }
  // Evalúa en función pura
  const fn = new Function("context", `return (!!(${expression}))`);
  return !!fn(context);
};

export function Simulator({
  nodes,
  edges,
}: {
  nodes: FlowNode[];
  edges: FlowEdge[];
}) {
  const [input, setInput] = useState("/start");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedNode, setPausedNode] = useState<FlowNode | null>(null);
  const [context, setContext] = useState<SimContext>({ vars: {} });
  const [ignoreDelays, setIgnoreDelays] = useState(false);
  const [stepMode, setStepMode] = useState(false);
  const [awaitingStep, setAwaitingStep] = useState(false);

  const logRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const contextRef = useRef<SimContext>({ vars: {} });
  const awaitingStepRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  useEffect(() => {
    if (!stepMode) {
      awaitingStepRef.current = false;
      setAwaitingStep(false);
    }
  }, [stepMode]);

  const idMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const outgoing = useMemo(() => {
    const map = new Map<string, FlowEdge[]>();
    edges.forEach((e) => {
      const arr = map.get(e.source) || [];
      arr.push(e);
      map.set(e.source, arr);
    });
    return map;
  }, [edges]);

  const addLog = useCallback((entry: LogEntryInput) => {
    const withTimestamp: LogEntry = { ...entry, ts: now() };
    setLog((prev) => prev.concat(withTimestamp));
  }, []);

  // Autoscroll
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const wait = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

  const maybeStepPause = useCallback(async () => {
    if (!stepMode) return;
    awaitingStepRef.current = true;
    setAwaitingStep(true);
    await new Promise<void>((resolve) => {
      const check = () => {
        if (!mountedRef.current) return resolve();
        if (!awaitingStepRef.current) return resolve();
        requestAnimationFrame(check);
      };
      check();
    });
  }, [setAwaitingStep, stepMode]);

  const step = useCallback(() => {
    awaitingStepRef.current = false;
    setAwaitingStep(false);
  }, []);

  const execute = useCallback(
    async (startNodeObj: FlowNode | string) => {
      let current: FlowNode | null =
        typeof startNodeObj === "string"
          ? idMap.get(startNodeObj) ?? null
          : startNodeObj;

      const visited = new Set<string>();
      let guard = 0;

      while (current && guard < 500) {
        await maybeStepPause();

        if (!mountedRef.current) return;
        guard += 1;

        if (visited.has(current.id)) {
          addLog({ type: "system", text: "Error: Loop detected" });
          awaitingStepRef.current = false;
          setAwaitingStep(false);
          return;
        }
        visited.add(current.id);

        const runtimeContext = contextRef.current;

        switch (current.type) {
          case "trigger": {
            break;
          }
          case "message": {
            const data = current.data as MessageNodeData | undefined;
            const text = tpl(data?.text, runtimeContext);
            addLog({ type: "bot", text });
            break;
          }
          case "media": {
            const data = current.data as MediaNodeData | undefined;
            const mediaType = data?.mediaType ?? "";
            const url = tpl(data?.url, runtimeContext);
            const caption = tpl(data?.caption, runtimeContext);
            const display =
              `[${mediaType.toUpperCase() || "MEDIA"}] ${url} ${caption || ""}`.trim();
            addLog({ type: "bot", text: display });
            break;
          }
          case "assign": {
            const data = current.data as AssignNodeData | undefined;
            const key = data?.key;
            const rawValue = data?.value ?? "";
            if (typeof key === "string" && key.trim()) {
              const value = tpl(rawValue, runtimeContext);
              setContext((prev) => {
                const nextVars = structuredClone(prev.vars) as Record<string, unknown>;
                setDeepValue(nextVars, key, value);
                const nextContext: SimContext = { vars: nextVars };
                contextRef.current = nextContext;
                return nextContext;
              });
            }
            break;
          }
          case "delay": {
            const data = current.data as DelayNodeData | undefined;
            const seconds = Number(data?.seconds ?? 0);
            addLog({ type: "system", text: `⏱ Wait ${seconds}s` });
            if (!ignoreDelays && seconds > 0) {
              await wait(seconds * 1000);
            }
            break;
          }
          case "options": {
            const data = current.data as OptionsNodeData | undefined;
            const options = data?.options ?? [];
            const dataWithText = current.data as { text?: string };
            const prompt = tpl(dataWithText?.text, runtimeContext);
            addLog({ type: "options", text: prompt, options });
            awaitingStepRef.current = false;
            setAwaitingStep(false);
            setIsPaused(true);
            setPausedNode(current);
            return;
          }
          case "api": {
            const data = current.data as ApiNodeData | undefined;
            const method = (data?.method ?? "GET").toString().toUpperCase();
            const url = tpl(data?.url, runtimeContext);
            const bodyRaw = data?.body ?? "";
            const assignTo = data?.assignTo ?? "apiResult";
            const rawHeaders = (data?.headers ?? {}) as Record<string, unknown>;
            const headers = Object.fromEntries(
              Object.entries(rawHeaders).filter(
                (entry): entry is [string, string] => typeof entry[1] === "string",
              ),
            );
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
                init.body = tpl(bodyRaw, runtimeContext);
              }

              const res = await fetch(url, init);
              const responseText = await res.text();
              let parsed: unknown = responseText;
              try {
                parsed = JSON.parse(responseText);
              } catch {
                // texto plano
              }

              setContext((prev) => {
                const nextContext: SimContext = {
                  vars: { ...prev.vars, [assignTo]: parsed },
                };
                contextRef.current = nextContext;
                return nextContext;
              });
              addLog({ type: "system", text: `Stored result in ${assignTo}` });
            } catch (error: unknown) {
              if (error instanceof DOMException && error.name === "AbortError") {
                addLog({ type: "system", text: "API call aborted" });
              } else {
                const message = error instanceof Error ? error.message : String(error);
                addLog({ type: "system", text: `API error: ${message}` });
              }
            }
            break;
          }
          case "handoff": {
            const data = current.data as HandoffNodeData | undefined;
            const queue = data?.queue ?? "Default";
            const note = data?.note ? ` (${tpl(data.note, runtimeContext)})` : "";
            addLog({ type: "system", text: `Derivar a agente: ${queue}${note}` });
            break;
          }
          case "condition": {
            try {
              const data = current.data as ConditionNodeData | undefined;
              const result = evalCondition(
                String(data?.expression ?? "false"),
                runtimeContext,
              );
              const edgesFrom = outgoing.get(current.id) ?? [];
              const edge = edgesFrom.find(
                (candidate) => candidate.sourceHandle === (result ? "true" : "false"),
              );
              current = edge ? idMap.get(edge.target) ?? null : null;
              continue;
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : String(error);
              addLog({ type: "system", text: `Condition error: ${message}` });
            }
            break;
          }
          case "goto": {
            const data = current.data as GoToNodeData | undefined;
            const nextId = data?.targetNodeId ?? "";
            current = nextId ? idMap.get(nextId) ?? null : null;
            continue;
          }
          case "end": {
            addLog({ type: "system", text: "🏁 End" });
            current = null;
            break;
          }
          default: {
            break;
          }
        }

        if (!current) {
          break;
        }

        const nextEdge = outgoing.get(current.id)?.[0];
        current = nextEdge ? idMap.get(nextEdge.target) ?? null : null;
      }

      awaitingStepRef.current = false;
      setAwaitingStep(false);

      if (guard >= 500) {
        addLog({ type: "system", text: "Guard limit reached" });
      }
    },
    [
      addLog,
      idMap,
      ignoreDelays,
      maybeStepPause,
      outgoing,
      setContext,
      setIsPaused,
      setPausedNode,
      setAwaitingStep,
    ],
  );

  const handleSendMessage = useCallback(
    async (message?: string) => {
      const messageToSend = (message ?? input).trim();
      if (isRunning || !messageToSend) return;

      awaitingStepRef.current = false;
      setAwaitingStep(false);
      setIsRunning(true);
      addLog({ type: "user", text: messageToSend });

      try {
        if (isPaused && pausedNode) {
          if (pausedNode.type !== "options") {
            setIsPaused(false);
            setPausedNode(null);
          } else {
            const userText = messageToSend.toLowerCase().trim();
            const options = (pausedNode.data as OptionsNodeData | undefined)?.options ?? [];
            const idx = options.findIndex(
              (option) => option.toLowerCase().trim() === userText,
            );

            let nextNodeId: string | undefined;
            const edgesFrom = outgoing.get(pausedNode.id) ?? [];
            if (idx !== -1) {
              const handleId = `opt-${idx}`;
              nextNodeId = edgesFrom.find(
                (edge) => edge.sourceHandle === handleId,
              )?.target;
            } else {
              nextNodeId = edgesFrom.find(
                (edge) => edge.sourceHandle === "no-match",
              )?.target;
            }

            setIsPaused(false);
            setPausedNode(null);

            if (nextNodeId) {
              const nextNode = idMap.get(nextNodeId);
              if (nextNode) {
                await execute(nextNode);
              } else {
                addLog({
                  type: "system",
                  text: `No node found for id ${nextNodeId}`,
                });
              }
            } else {
              addLog({ type: "system", text: "No path for this option." });
            }
          }
        } else {
          const initial: SimContext = { vars: {} };
          contextRef.current = initial;
          setContext(initial);
          const msgLc = messageToSend.toLowerCase();
          const startNode = nodes.find((node) => {
            if (node.type !== "trigger") return false;
            const data = node.data as TriggerNodeData | undefined;
            return (data?.keyword ?? "").toLowerCase() === msgLc;
          });
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
    [
      addLog,
      execute,
      idMap,
      input,
      isPaused,
      isRunning,
      nodes,
      outgoing,
      pausedNode,
    ],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setLog([]);
    setIsPaused(false);
    setPausedNode(null);
    const initial = { vars: {} };
    contextRef.current = initial;
    setContext(initial);
    setInput("/start");
    awaitingStepRef.current = false;
    setAwaitingStep(false);
  }, []);

  const copyLog = useCallback(() => {
    const formatted = log
      .map((line) => {
        const time = new Date(line.ts).toLocaleTimeString();
        switch (line.type) {
          case "bot":
            return `${time} Bot: ${line.text}`;
          case "user":
            return `${time} You: ${line.text}`;
          case "options":
            return `${time} Options: ${line.text ?? "Options"}`;
          case "system":
          default:
            return `${time} ${line.text}`;
        }
      })
      .join("\n");
    void navigator.clipboard.writeText(formatted);
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
                <Switch
                  id="ignore-delays"
                  checked={ignoreDelays}
                  onCheckedChange={setIgnoreDelays}
                />
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="step-mode" className="text-sm">
                  Step
                </Label>
                <Switch
                  id="step-mode"
                  checked={stepMode}
                  onCheckedChange={(v) => {
                    setStepMode(v);
                    if (!v) {
                      awaitingStepRef.current = false;
                      setAwaitingStep(false);
                    }
                  }}
                />
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
                    <div className="mt-2 flex flex-wrap gap-2">
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
