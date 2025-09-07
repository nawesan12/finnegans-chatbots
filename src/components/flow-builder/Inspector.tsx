"use client";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Trash2, Plus, MoveUpRight } from "lucide-react";
import { waTextLimit } from "./types";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

// --- utils ---
type AnyNode = {
  id: string;
  type: string;
  data: Record<string, any>;
};

type InspectorProps = {
  selectedNode: AnyNode | null;
  onChange: (partial: Partial<AnyNode>) => void;
};

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

const useDebounced = <T,>(value: T, delay = 180) => {
  const [v, setV] = useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};

const set = (obj: any, path: string, val: any) => {
  const parts = path.split(".");
  const clone = structuredClone(obj ?? {});
  let cur = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    cur[p] = cur[p] ?? {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = val;
  return clone;
};

const HeaderJSONField = ({
  value,
  onValidJSON,
}: {
  value: Record<string, any> | undefined;
  onValidJSON: (obj: Record<string, any>) => void;
}) => {
  const raw = JSON.stringify(value ?? {}, null, 2);
  const [text, setText] = useState(raw);
  const debouncedText = useDebounced(text, 220);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    // si desde afuera cambian headers, sincronizo editor
    setText(JSON.stringify(value ?? {}, null, 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);

  React.useEffect(() => {
    try {
      const obj = debouncedText.trim() ? JSON.parse(debouncedText) : {};
      setError(null);
      onValidJSON(obj);
    } catch (e: any) {
      setError(e?.message || "JSON inválido");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedText]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label>Headers (JSON)</Label>
        <Badge variant={error ? "destructive" : "secondary"}>
          {error ? "Invalid" : "OK"}
        </Badge>
      </div>
      <Textarea
        className="font-mono min-h-[140px]"
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        aria-invalid={!!error}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

const VarHelpers = ({
  onInsert,
  vars = ["name", "order_id", "email", "phone"],
}: {
  onInsert: (tpl: string) => void;
  vars?: string[];
}) => {
  return (
    <div className="flex flex-wrap gap-1">
      {vars.map((v) => (
        <Button
          key={v}
          type="button"
          size="xs"
          variant="ghost"
          className="h-6 px-2 text-xs"
          onClick={() => onInsert(`{{ ${v} }}`)}
          title={`Insertar {{ ${v} }}`}
        >
          + {v}
        </Button>
      ))}
      <Button
        type="button"
        size="xs"
        variant="secondary"
        className="h-6 px-2 text-xs"
        onClick={() => onInsert("{{ custom_var }}")}
        title="Insertar variable personalizada"
      >
        <Plus className="h-3 w-3 mr-1" /> var
      </Button>
    </div>
  );
};

// --- Inspector ---
export function Inspector({ selectedNode, onChange }: InspectorProps) {
  const sn = selectedNode;

  const updateData = useCallback(
    (path: string, val: any) => {
      if (!sn) return;
      const nextData = set(sn.data ?? {}, path, val);
      onChange({ data: nextData });
    },
    [sn, onChange],
  );

  const handleValidHeaders = useCallback(
    (obj: Record<string, any>) => updateData("headers", obj),
    [updateData],
  );

  const appendMessage = useCallback(
    (textToInsert: string) => {
      if (!sn) return;
      const cur = sn.data?.text ?? "";
      const next = (cur + (cur ? " " : "") + textToInsert).trim();
      updateData("text", next);
    },
    [sn, updateData],
  );

  if (!sn) {
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

  const type = sn.type;
  const name = sn.data?.name ?? "";
  const textLen = sn.data?.text?.length ?? 0;
  const overLimit = textLen > waTextLimit;
  const remaining = Math.max(0, waTextLimit - textLen);

  return (
    <Card className="h-full overflow-auto">
      <CardHeader className="sticky top-0 bg-card z-10 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-xl uppercase">
              {type}
            </Badge>
            <span
              className="truncate max-w-[260px]"
              title={sn.data?.name || sn.id}
            >
              {sn.data?.name || sn.id}
            </span>
          </CardTitle>
          <Badge
            variant="outline"
            className="hidden md:inline-flex"
            title="Node ID"
          >
            <MoveUpRight className="h-3 w-3 mr-1" />
            {sn.id}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* common */}
        <div className="space-y-2">
          <Label>Display Name</Label>
          <Input
            value={name}
            onChange={(e) => updateData("name", e.target.value)}
            placeholder="Internal name"
          />
        </div>

        <Separator />

        {/* TRIGGER */}
        {type === "trigger" && (
          <div className="space-y-2">
            <Label>Keyword</Label>
            <Input
              value={sn.data?.keyword || ""}
              onChange={(e) => updateData("keyword", e.target.value)}
              placeholder="/start, hola, menu..."
            />
          </div>
        )}

        {/* MESSAGE */}
        {type === "message" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Use Template</Label>
              <Switch
                checked={!!sn.data?.useTemplate}
                onCheckedChange={(v) => updateData("useTemplate", v)}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label>Text</Label>
                <Badge variant={overLimit ? "destructive" : "secondary"}>
                  {textLen}/{waTextLimit}{" "}
                  {overLimit ? "• Excede" : `• Restan ${remaining}`}
                </Badge>
              </div>
              <Textarea
                className="min-h-[140px]"
                value={sn.data?.text || ""}
                onChange={(e) => updateData("text", e.target.value)}
                placeholder="Hello {{ name }}!"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Usá variables como {"{{ name }}"}, {"{{ order_id }}"}.
                </p>
                <VarHelpers onInsert={appendMessage} />
              </div>
            </div>
          </div>
        )}

        {/* OPTIONS */}
        {type === "options" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Options</Label>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const next = [...(sn.data?.options ?? []), "New Option"];
                  updateData("options", next);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add option
              </Button>
            </div>

            <div className="space-y-2">
              {(sn.data?.options ?? []).map((opt: string, i: number) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const next = [...sn.data.options];
                      next[i] = e.target.value;
                      updateData("options", next);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const next = [...(sn.data?.options ?? []), ""];
                        updateData("options", next);
                      }
                    }}
                  />
                  <Button
                    variant="ghost"
                    title="Delete option"
                    onClick={() => {
                      const next = [...sn.data.options];
                      next.splice(i, 1);
                      updateData("options", next);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {/* pegado masivo: una opción por línea */}
              <Textarea
                placeholder="Pegar varias opciones (una por línea)…"
                className="min-h-[80px] text-xs"
                onPaste={(e) => {
                  const txt = e.clipboardData.getData("text");
                  if (!txt?.includes("\n")) return;
                  e.preventDefault();
                  const lines = txt
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  const next = [...(sn.data?.options ?? []), ...lines];
                  updateData("options", next);
                }}
              />
            </div>
          </div>
        )}

        {/* DELAY */}
        {type === "delay" && (
          <div className="space-y-2">
            <Label>Seconds</Label>
            <Slider
              value={[sn.data?.seconds || 1]}
              min={1}
              max={3600}
              step={1}
              onValueChange={([v]) => updateData("seconds", v)}
            />
            <div className="text-xs text-muted-foreground">
              {sn.data?.seconds || 1}s
            </div>
          </div>
        )}

        {/* CONDITION */}
        {type === "condition" && (
          <div className="space-y-2">
            <Label>Expression</Label>
            <Textarea
              value={sn.data?.expression || ""}
              onChange={(e) => updateData("expression", e.target.value)}
              placeholder={
                "e.g., context.order_total > 100 && context.country === 'AR'"
              }
              className="font-mono"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Tip: podés usar <code>context</code> y variables asignadas
              previamente.
            </p>
          </div>
        )}

        {/* API */}
        {type === "api" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Method</Label>
                <Select
                  value={(sn.data?.method || "POST").toUpperCase()}
                  onValueChange={(v) => updateData("method", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent>
                    {HTTP_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Assign to</Label>
                <Input
                  value={sn.data?.assignTo || "apiResult"}
                  onChange={(e) => updateData("assignTo", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>URL</Label>
              <Input
                value={sn.data?.url || ""}
                onChange={(e) => updateData("url", e.target.value)}
                placeholder="https://api.example.com/resource"
                inputMode="url"
              />
            </div>

            <HeaderJSONField
              value={sn.data?.headers}
              onValidJSON={handleValidHeaders}
            />

            <div className="space-y-1">
              <Label>Body</Label>
              <Textarea
                value={sn.data?.body || ""}
                onChange={(e) => updateData("body", e.target.value)}
                placeholder='{"id": "{{ order_id }}"}'
                className="font-mono min-h-[120px]"
                spellCheck={false}
              />
            </div>
          </div>
        )}

        {/* ASSIGN */}
        {type === "assign" && (
          <div className="space-y-2">
            <Label>Key</Label>
            <Input
              value={sn.data?.key || ""}
              onChange={(e) => updateData("key", e.target.value)}
              placeholder="context.customer_name"
            />
            <Label>Value</Label>
            <Input
              value={sn.data?.value || ""}
              onChange={(e) => updateData("value", e.target.value)}
              placeholder="{{ name }}"
            />
          </div>
        )}

        {/* MEDIA */}
        {type === "media" && (
          <div className="space-y-2">
            <Label>Media URL</Label>
            <Input
              value={sn.data?.url || ""}
              onChange={(e) => updateData("url", e.target.value)}
              inputMode="url"
            />
            <Label>Type</Label>
            <Input
              value={sn.data?.mediaType || "image"}
              onChange={(e) => updateData("mediaType", e.target.value)}
              placeholder="image | video | audio | document"
            />
            <Label>Caption</Label>
            <Input
              value={sn.data?.caption || ""}
              onChange={(e) => updateData("caption", e.target.value)}
              placeholder="Texto opcional…"
            />
          </div>
        )}

        {/* HANDOFF */}
        {type === "handoff" && (
          <div className="space-y-2">
            <Label>Queue</Label>
            <Input
              value={sn.data?.queue || ""}
              onChange={(e) => updateData("queue", e.target.value)}
            />
            <Label>Note</Label>
            <Input
              value={sn.data?.note || ""}
              onChange={(e) => updateData("note", e.target.value)}
            />
          </div>
        )}

        {/* GOTO */}
        {type === "goto" && (
          <div className="space-y-2">
            <Label>Target Node ID</Label>
            <Input
              value={sn.data?.targetNodeId || ""}
              onChange={(e) => updateData("targetNodeId", e.target.value)}
              placeholder="e.g., n7"
            />
            <p className="text-xs text-muted-foreground">
              Consejo: seleccioná un nodo en el lienzo y copiá su ID desde la
              barra de herramientas.
            </p>
          </div>
        )}

        {/* END */}
        {type === "end" && (
          <div className="space-y-2">
            <Label>Reason</Label>
            <Input
              value={sn.data?.reason || "end"}
              onChange={(e) => updateData("reason", e.target.value)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
