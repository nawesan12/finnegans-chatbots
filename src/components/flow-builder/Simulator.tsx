import React, { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Play, Rocket, RotateCcw, Copy, Loader2 } from "lucide-react";

export function Simulator({ nodes, edges }) {
    const [input, setInput] = useState("/start");
    const [log, setLog] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
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

    const run = async () => {
        if (isRunning) return;
        setIsRunning(true);
        try {
        const context: {
            input: string;
            vars: Record<string, unknown>;
            apiResult: unknown;
        } = { input, vars: {}, apiResult: null };
        const addLog = (entry: { type: string; text: string }) =>
            setLog((prev) => [...prev, entry]);
        setLog([{ type: "user", text: input }]);
        // find trigger matching input
        const start = nodes.find(
            (n) =>
                n.type === "trigger" &&
                n.data.keyword?.toLowerCase() === input.toLowerCase(),
        );
        if (!start) {
            addLog({ type: "system", text: "No trigger matches the input" });
            return;
        }
        let current = start;
        const visited = new Set();
        let guard = 0;
        while (current && guard < 200) {
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
                context.vars[current.data.key] = current.data.value;
            }
            if (current.type === "delay") {
                addLog({ type: "system", text: `⏱ Wait ${current.data.seconds}s` });
                await new Promise((r) =>
                    setTimeout(r, (current.data.seconds || 0) * 1000),
                );
            }
            if (current.type === "options") {
                addLog({
                    type: "bot",
                    text: current.data.options
                        .map((opt, i) => `${i + 1}. ${opt}`)
                        .join(" | "),
                });
                addLog({
                    type: "system",
                    text: `Auto-selecting "${current.data.options[0]}"`,
                });
                const e = (outgoing.get(current.id) || []).find(
                    (ed) => ed.sourceHandle === "opt-0",
                );
                current = e ? idMap.get(e.target) : null;
                continue;
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
                            current.data.method !== "GET"
                                ? current.data.body
                                : undefined,
                    });
                    const text = await res.text();
                    let parsed: unknown;
                    try {
                        parsed = JSON.parse(text);
                    } catch {
                        parsed = text;
                    }
                    context.vars[current.data.assignTo] = parsed;
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
                    // VERY basic eval – simulation only
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
            // default follow single edge
            const nextEdge = (outgoing.get(current.id) || [])[0];
            current = nextEdge ? idMap.get(nextEdge.target) : null;
        }
        if (Object.keys(context.vars).length > 0) {
            addLog({
                type: "system",
                text: `Vars: ${JSON.stringify(context.vars)}`,
            });
        }
    } finally {
        setIsRunning(false);
    }
    };

    const copyLog = () => {
        const text = log
            .map((line) => {
                const prefix =
                    line.type === "bot"
                        ? "Bot: "
                        : line.type === "user"
                        ? "You: "
                        : "";
                return `${prefix}${line.text}`;
            })
            .join("\n");
        navigator.clipboard.writeText(text);
    };

    useEffect(() => {
        setLog([]);
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
                <div className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                run();
                            }
                        }}
                        placeholder="/start"
                    />
                    <Button onClick={run} disabled={isRunning || !input.trim()}>
                        {isRunning ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Rocket className="h-4 w-4 mr-2" />
                        )}
                        {isRunning ? "Ejecutando" : "Iniciar"}
                    </Button>
                    <Button variant="outline" onClick={() => setLog([])}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Limpiar
                    </Button>
                    <Button variant="outline" onClick={copyLog}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar
                    </Button>
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
                            {line.type === "bot" ? "🤖 " : line.type === "user" ? "👤 " : "• "}
                            {line.text}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
