import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Play, Rocket } from "lucide-react";

export function Simulator({ nodes, edges }) {
    const [input, setInput] = useState("/start");
    const [log, setLog] = useState([]);

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

    const run = () => {
        const context = { input, vars: {}, apiResult: null };
        const out = [];
        // find trigger matching input
        const start = nodes.find(
            (n) =>
                n.type === "trigger" &&
                n.data.keyword?.toLowerCase() === input.toLowerCase(),
        );
        if (!start) {
            out.push({ type: "system", text: "No trigger matches the input" });
            setLog(out);
            return;
        }
        let current = start;
        const visited = new Set();
        let guard = 0;
        while (current && guard < 200) {
            visited.add(current.id);
            guard++;
            if (current.type === "message") {
                out.push({ type: "bot", text: current.data.text });
            }
            if (current.type === "media") {
                out.push({
                    type: "bot",
                    text: `[${current.data.mediaType.toUpperCase()}] ${current.data.url} ${current.data.caption || ""}`,
                });
            }
            if (current.type === "assign") {
                context.vars[current.data.key] = current.data.value;
            }
            if (current.type === "delay") {
                out.push({ type: "system", text: `⏱ Wait ${current.data.seconds}s` });
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
                    out.push({ type: "system", text: `Condition error: ${String(e)}` });
                }
            }
            if (current.type === "goto") {
                current = idMap.get(current.data.targetNodeId);
                continue;
            }
            if (current.type === "end") {
                out.push({ type: "system", text: "🏁 End" });
                break;
            }
            // default follow single edge
            const nextEdge = (outgoing.get(current.id) || [])[0];
            current = nextEdge ? idMap.get(nextEdge.target) : null;
        }
        if (Object.keys(context.vars).length > 0) {
            out.push({
                type: "system",
                text: `Vars: ${JSON.stringify(context.vars)}`,
            });
        }
        setLog(out);
    };

    useEffect(() => {
        setLog([]);
    }, [nodes, edges]);

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
                        placeholder="/start"
                    />
                    <Button onClick={run}>
                        <Rocket className="h-4 w-4 mr-2" />
                        Iniciar
                    </Button>
                </div>
                <div className="border rounded-lg p-3 h-[260px] overflow-auto bg-muted/30 space-y-2">
                    {log.length === 0 && (
                        <div className="text-sm text-muted-foreground">
                            Sin simulaciones. Presiona Iniciar.
                        </div>
                    )}
                    {log.map((line, i) => (
                        <div
                            key={i}
                            className={`text-sm ${line.type === "bot" ? "" : "text-muted-foreground"}`}
                        >
                            {line.type === "bot" ? "🤖 " : "• "}
                            {line.text}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
