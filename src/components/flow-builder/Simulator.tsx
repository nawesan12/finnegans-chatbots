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
  StopCircle,
  Timer,
  CheckCircle2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FlowEdge, FlowNode } from "./types";
import { isNodeOfType } from "./types";

type LogEntryBase =
  | { type: "user"; text: string }
  | { type: "bot"; text: string }
  | { type: "options"; text?: string; options: string[] }
  | { type: "system"; text: string };

type LogEntry = LogEntryBase & { ts: number };

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
  const [selectedTriggerId, setSelectedTriggerId] = useState<string>();
  const [initialContextDraft, setInitialContextDraft] = useState("");
  const [initialContextError, setInitialContextError] = useState<string | null>(
    null,
  );

  const logRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const contextRef = useRef<SimContext>({ vars: {} });
  const awaitingStepRef = useRef(false);
  const abortExecutionRef = useRef(false);

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

  const triggerNodes = useMemo(
    () => nodes.filter((node) => isNodeOfType(node, "trigger")),
    [nodes],
  );

  useEffect(() => {
    if (!triggerNodes.length) {
      setSelectedTriggerId(undefined);
      return;
    }
    setSelectedTriggerId((current) => {
      if (current && triggerNodes.some((node) => node.id === current)) {
        return current;
      }
      return triggerNodes[0]?.id;
    });
  }, [triggerNodes]);

  const selectedTriggerKeyword = useMemo(() => {
    if (!triggerNodes.length) return "";
    const current = triggerNodes.find((node) => node.id === selectedTriggerId);
    const fallback = current ?? triggerNodes[0];
    return (fallback?.data.keyword ?? "").toString();
  }, [selectedTriggerId, triggerNodes]);

  const outgoing = useMemo(() => {
    const map = new Map<string, FlowEdge[]>();
    edges.forEach((e) => {
      const arr = map.get(e.source) || [];
      arr.push(e);
      map.set(e.source, arr);
    });
    return map;
  }, [edges]);

  const addLog = useCallback((entry: LogEntryBase) => {
    const withTimestamp = { ...entry, ts: now() } as LogEntry;
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

  const parseInitialContext = useCallback(
    ({ silent = false }: { silent?: boolean } = {}) => {
      const trimmed = initialContextDraft.trim();
      if (!trimmed) {
        if (!silent) {
          setInitialContextError(null);
        }
        return {} as Record<string, unknown>;
      }

      try {
        const parsed = JSON.parse(trimmed);
        if (
          parsed === null ||
          Array.isArray(parsed) ||
          typeof parsed !== "object"
        ) {
          throw new Error(
            'El JSON debe ser un objeto (por ejemplo, {"foo": "bar"}).',
          );
        }
        if (!silent) {
          setInitialContextError(null);
        }
        return parsed as Record<string, unknown>;
      } catch (error: unknown) {
        if (!silent) {
          const message =
            error instanceof Error
              ? error.message
              : "No se pudo interpretar el JSON";
          setInitialContextError(`Revisá el contexto: ${message}`);
        }
        return null;
      }
    },
    [initialContextDraft],
  );

  const applyInitialContext = useCallback(() => {
    const parsed = parseInitialContext();
    if (!parsed) return;
    const nextContext: SimContext = { vars: structuredClone(parsed) };
    contextRef.current = nextContext;
    setContext(nextContext);
    addLog({
      type: "system",
      text: "Contexto inicial aplicado manualmente",
    });
  }, [addLog, parseInitialContext]);

  const execute = useCallback(
    async (startNodeObj: FlowNode | string) => {
      let current: FlowNode | null =
        typeof startNodeObj === "string"
          ? (idMap.get(startNodeObj) ?? null)
          : startNodeObj;

      const visited = new Set<string>();
      let guard = 0;
      abortExecutionRef.current = false;
      let aborted = false;

      while (current && guard < 500) {
        await maybeStepPause();

        if (!mountedRef.current) return;
        if (abortExecutionRef.current) {
          aborted = true;
          break;
        }
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
            if (!isNodeOfType(current, "message")) break;
            if (current.data.useTemplate) {
              const templateName = current.data.templateName ?? "(sin plantilla)";
              const templateLanguage = current.data.templateLanguage ?? "";
              const params = Array.isArray(current.data.templateParameters)
                ? (current.data.templateParameters as Array<{
                    component?: string;
                    value?: string;
                  }> )
                : [];
              const resolvedParams = params.map((param) => {
                const componentLabel = (param.component ?? "BODY").toString().toUpperCase();
                const resolvedValue = tpl(param.value ?? "", runtimeContext);
                return `• ${componentLabel}: ${resolvedValue || "(vacío)"}`;
              });

              const lines = [
                `🧩 Template: ${templateName}${
                  templateLanguage ? ` (${templateLanguage})` : ""
                }`,
              ];
              if (resolvedParams.length) {
                lines.push("Parámetros:");
                lines.push(...resolvedParams);
              }

              addLog({ type: "bot", text: lines.join("\n") });
              break;
            }

            const text = tpl(current.data.text ?? "", runtimeContext);
            addLog({ type: "bot", text });
            break;
          }
          case "media": {
            if (!isNodeOfType(current, "media")) break;
            const mediaType = current.data.mediaType ?? "";
            const url = tpl(current.data.url, runtimeContext);
            const caption = tpl(current.data.caption, runtimeContext);
            const display =
              `[${mediaType.toUpperCase() || "MEDIA"}] ${url} ${caption || ""}`.trim();
            addLog({ type: "bot", text: display });
            break;
          }
          case "whatsapp_flow": {
            if (!isNodeOfType(current, "whatsapp_flow")) break;
            const header = tpl(current.data.header, runtimeContext).trim();
            const body = tpl(current.data.body, runtimeContext).trim();
            const footer = tpl(current.data.footer, runtimeContext).trim();
            const cta = tpl(current.data.cta, runtimeContext).trim();
            const segments = [
              header ? `🔹 ${header}` : null,
              body || "(sin mensaje)",
              footer || null,
              cta ? `CTA: ${cta}` : null,
            ].filter(Boolean) as string[];
            addLog({ type: "bot", text: segments.join("\n") });
            break;
          }
          case "assign": {
            if (!isNodeOfType(current, "assign")) break;
            const key = current.data.key;
            const rawValue = current.data.value ?? "";
            if (typeof key === "string" && key.trim()) {
              const value = tpl(rawValue, runtimeContext);
              setContext((prev) => {
                const nextVars = structuredClone(prev.vars) as Record<
                  string,
                  unknown
                >;
                setDeepValue(nextVars, key, value);
                const nextContext: SimContext = { vars: nextVars };
                contextRef.current = nextContext;
                return nextContext;
              });
              addLog({
                type: "system",
                text: `📝 ${key} = ${value}`,
              });
            }
            break;
          }
          case "delay": {
            if (!isNodeOfType(current, "delay")) break;
            const seconds = Number(current.data.seconds ?? 0);
            addLog({ type: "system", text: `⏱ Wait ${seconds}s` });
            if (!ignoreDelays && seconds > 0) {
              await wait(seconds * 1000);
            }
            break;
          }
          case "options": {
            if (!isNodeOfType(current, "options")) break;
            const options = Array.isArray(current.data.options)
              ? current.data.options
              : [];
            const prompt = tpl(
              (current.data as { text?: string }).text,
              runtimeContext,
            );
            addLog({ type: "options", text: prompt, options });
            awaitingStepRef.current = false;
            setAwaitingStep(false);
            setIsPaused(true);
            setPausedNode(current);
            return;
          }
          case "api": {
            if (!isNodeOfType(current, "api")) break;
            const method = (current.data.method ?? "GET")
              .toString()
              .toUpperCase();
            const url = tpl(current.data.url, runtimeContext);
            const bodyRaw = current.data.body ?? "";
            const assignTo = current.data.assignTo ?? "apiResult";
            const rawHeaders = current.data.headers ?? {};
            const headers = Object.fromEntries(
              Object.entries(rawHeaders).filter(
                (entry): entry is [string, string] =>
                  typeof entry[1] === "string",
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
              addLog({
                type: "system",
                text: `HTTP ${res.status} almacenado en ${assignTo}`,
              });
            } catch (error: unknown) {
              if (
                error instanceof DOMException &&
                error.name === "AbortError"
              ) {
                addLog({ type: "system", text: "API call aborted" });
              } else {
                const message =
                  error instanceof Error ? error.message : String(error);
                addLog({ type: "system", text: `API error: ${message}` });
              }
            }
            break;
          }
          case "condition": {
            if (!isNodeOfType(current, "condition")) break;
            try {
              const result = evalCondition(
                String(current.data.expression ?? "false"),
                runtimeContext,
              );
              const edgesFrom = outgoing.get(current.id) ?? [];
              const edge = edgesFrom.find(
                (candidate) =>
                  candidate.sourceHandle === (result ? "true" : "false"),
              );
              current = edge ? (idMap.get(edge.target) ?? null) : null;
              continue;
            } catch (error: unknown) {
              const message =
                error instanceof Error ? error.message : String(error);
              addLog({ type: "system", text: `Condition error: ${message}` });
            }
            break;
          }
          case "goto": {
            if (!isNodeOfType(current, "goto")) break;
            const nextId = current.data.targetNodeId ?? "";
            current = nextId ? (idMap.get(nextId) ?? null) : null;
            continue;
          }
          case "handoff": {
            if (!isNodeOfType(current, "handoff")) break;
            const queue = tpl(current.data.queue ?? "", runtimeContext);
            const note = tpl(current.data.note ?? "", runtimeContext);
            const parts = [
              "🤝 Transferencia a un agente",
              queue ? `Cola: ${queue}` : null,
              note ? `Nota: ${note}` : null,
            ].filter(Boolean);
            addLog({ type: "system", text: parts.join(" · ") });
            break;
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
        current = nextEdge ? (idMap.get(nextEdge.target) ?? null) : null;
      }

      awaitingStepRef.current = false;
      setAwaitingStep(false);
      const wasAborted = abortExecutionRef.current || aborted;
      abortExecutionRef.current = false;

      if (wasAborted) {
        addLog({ type: "system", text: "Simulación detenida" });
        return;
      }

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
      let shouldClearInput = true;

      try {
        if (isPaused && pausedNode) {
          if (!isNodeOfType(pausedNode, "options")) {
            setIsPaused(false);
            setPausedNode(null);
          } else {
            const userText = messageToSend.toLowerCase().trim();
            const opts = Array.isArray(pausedNode.data.options)
              ? pausedNode.data.options
              : [];
            const idx = opts.findIndex(
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
          const base = parseInitialContext();
          if (base === null) {
            addLog({
              type: "system",
              text: "Contexto inicial inválido. Corregilo para continuar.",
            });
            shouldClearInput = false;
            return;
          }
          const initial: SimContext = { vars: structuredClone(base) };
          contextRef.current = initial;
          setContext(initial);
          const msgLc = messageToSend.toLowerCase();
          const startNode = nodes.find(
            (node): node is FlowNode<"trigger"> =>
              isNodeOfType(node, "trigger") &&
              (node.data.keyword ?? "").toLowerCase() === msgLc,
          );
          if (startNode) {
            await execute(startNode);
          } else {
            addLog({ type: "system", text: "No trigger matches the input" });
          }
        }
      } finally {
        if (shouldClearInput) {
          setInput("");
        }
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
      parseInitialContext,
    ],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortExecutionRef.current = false;
    setLog([]);
    setIsPaused(false);
    setPausedNode(null);
    const base = parseInitialContext({ silent: true });
    const initial = { vars: structuredClone(base ?? {}) } satisfies SimContext;
    contextRef.current = initial;
    setContext(initial);
    setInput(selectedTriggerKeyword || "/start");
    awaitingStepRef.current = false;
    setAwaitingStep(false);
  }, [parseInitialContext, selectedTriggerKeyword]);

  const stop = useCallback(() => {
    if (!isRunning) return;
    abortExecutionRef.current = true;
    awaitingStepRef.current = false;
    setAwaitingStep(false);
    setIsPaused(false);
    setPausedNode(null);
    abortRef.current?.abort();
    setIsRunning(false);
  }, [isRunning]);

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

  const statusInfo = useMemo(() => {
    if (isRunning && awaitingStep) {
      return { label: "Esperando paso", variant: "secondary" as const };
    }
    if (isRunning && isPaused) {
      return { label: "Esperando respuesta", variant: "secondary" as const };
    }
    if (isRunning) {
      return { label: "Ejecutando", variant: "default" as const };
    }
    return { label: "Listo", variant: "outline" as const };
  }, [awaitingStep, isPaused, isRunning]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-4 w-4" /> Simulador
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {stepMode && <span>Step activado</span>}
            {ignoreDelays && <span>Delays ignorados</span>}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Panel de entrada */}
          <div className="col-span-2 space-y-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <Label className="text-xs font-medium text-muted-foreground">
                Triggers
              </Label>
              <Select
                value={selectedTriggerId ?? triggerNodes[0]?.id ?? ""}
                onValueChange={(value) => {
                  setSelectedTriggerId(value);
                  const chosen = triggerNodes.find((node) => node.id === value);
                  if (chosen?.data.keyword) {
                    setInput(chosen.data.keyword.toString());
                  }
                }}
                disabled={!triggerNodes.length}
              >
                <SelectTrigger size="sm" className="w-full md:w-auto">
                  <SelectValue placeholder="Sin triggers" />
                </SelectTrigger>
                <SelectContent>
                  {triggerNodes.length === 0 ? (
                    <SelectItem value="">Sin triggers</SelectItem>
                  ) : (
                    triggerNodes.map((node) => (
                      <SelectItem key={node.id} value={node.id}>
                        <div className="flex flex-col text-left">
                          <span>{node?.data?.keyword || "(sin texto)"}</span>
                          {
                            //@ts-expect-error bla
                            node?.data?.description && (
                              <span className="text-[10px] text-muted-foreground">
                                {
                                  //@ts-expect-error bla
                                  node?.data?.description
                                }
                              </span>
                            )
                          }
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
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

              <Button variant="outline" onClick={stop} disabled={!isRunning}>
                <StopCircle className="h-4 w-4 mr-2" />
                Detener
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
            <div className="mt-3 space-y-2">
              <Label htmlFor="simulator-initial-context" className="text-xs">
                Contexto inicial (JSON opcional)
              </Label>
              <Textarea
                id="simulator-initial-context"
                value={initialContextDraft}
                onChange={(event) => setInitialContextDraft(event.target.value)}
                placeholder='{"contact":{"nombre":"Ada"}}'
                className="h-32"
              />
              {initialContextError ? (
                <p className="text-xs text-destructive">
                  {initialContextError}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Se fusiona al iniciar un flujo. Dejalo vacío para comenzar con
                  un contexto limpio.
                </p>
              )}
              <div className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => parseInitialContext()}
                >
                  Validar
                </Button>
                <Button size="sm" onClick={applyInitialContext}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Aplicar ahora
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
