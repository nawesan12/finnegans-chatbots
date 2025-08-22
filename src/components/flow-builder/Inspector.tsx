import React from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Trash2 } from "lucide-react";
import { waTextLimit } from "./types";

export function Inspector({ selectedNode, onChange, allNodes }) {
    if (!selectedNode) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle>Inspector</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    Selecciona un nodo para editar sus propiedades.
                </CardContent>
            </Card>
        );
    }

    const common = (
        <div className="space-y-2">
            <Label>Display Name</Label>
            <Input
                value={selectedNode.data.name ?? ""}
                onChange={(e) =>
                    onChange({ data: { ...selectedNode.data, name: e.target.value } })
                }
                placeholder="Internal name"
            />
        </div>
    );

    const type = selectedNode.type;

    return (
        <Card className="h-full overflow-auto">
            <CardHeader className="sticky top-0 bg-card z-10 border-b">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Badge variant="secondary" className="rounded-xl">
                            {type}
                        </Badge>
                        {selectedNode.data.name || selectedNode.id}
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                {common}
                <Separator />
                {type === "trigger" && (
                    <div className="space-y-2">
                        <Label>Keyword</Label>
                        <Input
                            value={selectedNode.data.keyword || ""}
                            onChange={(e) =>
                                onChange({
                                    data: { ...selectedNode.data, keyword: e.target.value },
                                })
                            }
                            placeholder="/start, hola, menu..."
                        />
                    </div>
                )}
                {type === "message" && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Use Template</Label>
                            <Switch
                                checked={!!selectedNode.data.useTemplate}
                                onCheckedChange={(v) =>
                                    onChange({ data: { ...selectedNode.data, useTemplate: v } })
                                }
                            />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <Label>Text</Label>
                                <Badge
                                    variant={
                                        selectedNode.data.text?.length > 3500
                                            ? "destructive"
                                            : "secondary"
                                    }
                                >
                                    {selectedNode.data.text?.length || 0}/{waTextLimit}
                                </Badge>
                            </div>
                            <Textarea
                                className="min-h-[140px]"
                                value={selectedNode.data.text || ""}
                                onChange={(e) =>
                                    onChange({
                                        data: { ...selectedNode.data, text: e.target.value },
                                    })
                                }
                                placeholder="Hello {{name}}!"
                            />
                            <p className="text-xs text-muted-foreground">
                                Use variables like {"{{ name }}"}, {"{{ order_id }}"}.
                            </p>
                        </div>
                    </div>
                )}
                {type === "options" && (
                    <div className="space-y-2">
                        <Label>Options</Label>
                        <div className="space-y-2">
                            {(selectedNode.data.options || []).map((opt, i) => (
                                <div key={i} className="flex gap-2">
                                    <Input
                                        value={opt}
                                        onChange={(e) => {
                                            const next = [...selectedNode.data.options];
                                            next[i] = e.target.value;
                                            onChange({
                                                data: { ...selectedNode.data, options: next },
                                            });
                                        }}
                                    />
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            const next = [...selectedNode.data.options];
                                            next.splice(i, 1);
                                            onChange({
                                                data: { ...selectedNode.data, options: next },
                                            });
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    const next = [
                                        ...(selectedNode.data.options || []),
                                        "New Option",
                                    ];
                                    onChange({ data: { ...selectedNode.data, options: next } });
                                }}
                            >
                                Add option
                            </Button>
                        </div>
                    </div>
                )}
                {type === "delay" && (
                    <div className="space-y-2">
                        <Label>Seconds</Label>
                        <Slider
                            value={[selectedNode.data.seconds || 1]}
                            min={1}
                            max={300}
                            step={1}
                            onValueChange={([v]) =>
                                onChange({ data: { ...selectedNode.data, seconds: v } })
                            }
                        />
                        <div className="text-xs text-muted-foreground">
                            {selectedNode.data.seconds || 1}s
                        </div>
                    </div>
                )}
                {type === "condition" && (
                    <div className="space-y-2">
                        <Label>Expression</Label>
                        <Textarea
                            value={selectedNode.data.expression || ""}
                            onChange={(e) =>
                                onChange({
                                    data: { ...selectedNode.data, expression: e.target.value },
                                })
                            }
                            placeholder={
                                "e.g., context.order_total > 100 && context.country === 'AR'"
                            }
                        />
                    </div>
                )}
                {type === "api" && (
                    <div className="space-y-2">
                        <Label>URL</Label>
                        <Input
                            value={selectedNode.data.url || ""}
                            onChange={(e) =>
                                onChange({
                                    data: { ...selectedNode.data, url: e.target.value },
                                })
                            }
                        />
                        <Label>Method</Label>
                        <Input
                            value={selectedNode.data.method || "POST"}
                            onChange={(e) =>
                                onChange({
                                    data: { ...selectedNode.data, method: e.target.value },
                                })
                            }
                        />
                        <Label>Headers (JSON)</Label>
                        <Textarea
                            value={JSON.stringify(selectedNode.data.headers || {}, null, 2)}
                            onChange={(e) => {
                                try {
                                    onChange({
                                        data: {
                                            ...selectedNode.data,
                                            headers: JSON.parse(e.target.value || "{}"),
                                        },
                                    });
                                } catch { }
                            }}
                        />
                        <Label>Body</Label>
                        <Textarea
                            value={selectedNode.data.body || ""}
                            onChange={(e) =>
                                onChange({
                                    data: { ...selectedNode.data, body: e.target.value },
                                })
                            }
                        />
                        <Label>Assign to</Label>
                        <Input
                            value={selectedNode.data.assignTo || "apiResult"}
                            onChange={(e) =>
                                onChange({
                                    data: { ...selectedNode.data, assignTo: e.target.value },
                                })
                            }
                        />
                    </div>
                )}
                {type === "assign" && (
                    <div className="space-y-2">
                        <Label>Key</Label>
                        <Input
                            value={selectedNode.data.key || ""}
                            onChange={(e) =>
                                onChange({
                                    data: { ...selectedNode.data, key: e.target.value },
                                })
                            }
                        />
                        <Label>Value</Label>
                        <Input
                            value={selectedNode.data.value || ""}
                            onChange={(e) =>
                                onChange({
                                    data: { ...selectedNode.data, value: e.target.value },
                                })
                            }
                        />
                    </div>
                )}
                {type === "media" && (
                    <div className="space-y-2">
                        <Label>Media URL</Label>
                        <Input
                            value={selectedNode.data.url || ""}
                            onChange={(e) =>
                                onChange({
                                    data: { ...selectedNode.data, url: e.target.value },
                                })
                            }
                        />
                        <Label>Type</Label>
                        <Input
                            value={selectedNode.data.mediaType || "image"}
                            onChange={(e) =>
                                onChange({
                                    data: { ...selectedNode.data, mediaType: e.target.value },
                                })
                            }
                        />
                        <Label>Caption</Label>
                        <Input
                            value={selectedNode.data.caption || ""}
                            onChange={(e) =>
                                onChange({
                                    data: { ...selectedNode.data, caption: e.target.value },
                                })
                            }
                        />
                    </div>
                )}
                {type === "handoff" && (
                    <div className="space-y-2">
                        <Label>Queue</Label>
                        <Input
                            value={selectedNode.data.queue || ""}
                            onChange={(e) =>
                                onChange({
                                    data: { ...selectedNode.data, queue: e.target.value },
                                })
                            }
                        />
                        <Label>Note</Label>
                        <Input
                            value={selectedNode.data.note || ""}
                            onChange={(e) =>
                                onChange({
                                    data: { ...selectedNode.data, note: e.target.value },
                                })
                            }
                        />
                    </div>
                )}
                {type === "goto" && (
                    <div className="space-y-2">
                        <Label>Target Node ID</Label>
                        <Input
                            value={selectedNode.data.targetNodeId || ""}
                            onChange={(e) =>
                                onChange({
                                    data: { ...selectedNode.data, targetNodeId: e.target.value },
                                })
                            }
                            placeholder="e.g., n7"
                        />
                        <p className="text-xs text-muted-foreground">
                            Consejo: selecciona un nodo en el lienzo y copia su ID desde la
                            barra de herramientas.
                        </p>
                    </div>
                )}
                {type === "end" && (
                    <div className="space-y-2">
                        <Label>Reason</Label>
                        <Input
                            value={selectedNode.data.reason || "end"}
                            onChange={(e) =>
                                onChange({
                                    data: { ...selectedNode.data, reason: e.target.value },
                                })
                            }
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
