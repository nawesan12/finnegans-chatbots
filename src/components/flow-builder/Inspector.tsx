"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Trash2, Plus, MoveUpRight, Loader2, RefreshCw } from "lucide-react";
import type { FlowNode, TemplateParameterData } from "./types";
import { waTextLimit, isNodeOfType } from "./types";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { authenticatedFetch } from "@/lib/api-client";

type InspectorProps = {
  selectedNode: FlowNode | null;
  onChange: (partial: { data: FlowNode["data"] }) => void;
};

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

const TEMPLATE_COMPONENT_OPTIONS = [
  { value: "HEADER", label: "Header" },
  { value: "BODY", label: "Body" },
  { value: "FOOTER", label: "Footer" },
  { value: "BUTTON", label: "Button" },
] as const;

type MetaTemplateComponentSummary = {
  type: string;
  subType?: string | null;
  index?: number | null;
  text?: string | null;
  example?: Record<string, unknown> | null;
};

type MetaTemplateSummary = {
  id: string;
  name: string;
  language: string;
  status: string | null;
  category?: string | null;
  components: MetaTemplateComponentSummary[];
};

const normalizeTemplateComponentType = (value?: string | null) =>
  (value ?? "").toUpperCase();

const extractExampleValues = (example: unknown): string[] => {
  const values: string[] = [];
  const visit = (input: unknown) => {
    if (typeof input === "string") {
      values.push(input);
      return;
    }
    if (Array.isArray(input)) {
      input.forEach(visit);
      return;
    }
    if (input && typeof input === "object") {
      Object.values(input as Record<string, unknown>).forEach(visit);
    }
  };
  visit(example);
  return values;
};

const deriveParametersFromTemplate = (
  template: MetaTemplateSummary,
): TemplateParameterData[] => {
  const params: TemplateParameterData[] = [];

  template.components.forEach((component) => {
    const componentType =
      normalizeTemplateComponentType(component.type) || "BODY";
    const subType = component.subType ?? undefined;
    const index =
      typeof component.index === "number" && Number.isFinite(component.index)
        ? component.index
        : undefined;
    const exampleValues = extractExampleValues(component.example);

    if (exampleValues.length) {
      exampleValues.forEach((value) => {
        params.push({
          component: componentType,
          type: "text",
          subType,
          index,
          value,
        });
      });
      return;
    }

    const text = typeof component.text === "string" ? component.text : "";
    if (!text) return;
    const matches = [...text.matchAll(/\{\{\d+\}\}/g)];
    if (!matches.length) return;

    matches.forEach(() => {
      params.push({
        component: componentType,
        type: "text",
        subType,
        index,
        value: "",
      });
    });
  });

  return params;
};

const useDebounced = <T,>(value: T, delay = 180) => {
  const [v, setV] = useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};

const setNestedValue = (
  obj: FlowNode["data"] | undefined,
  path: string,
  val: unknown,
): FlowNode["data"] => {
  const parts = path.split(".");
  const clone = structuredClone((obj ?? {}) as Record<string, unknown>);
  let cur = clone as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    const next = cur[key];
    if (typeof next !== "object" || next === null) {
      cur[key] = {};
    }
    cur = cur[key] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = val;
  return clone as FlowNode["data"];
};

const HeaderJSONField = ({
  value,
  onValidJSON,
}: {
  value: Record<string, unknown> | undefined;
  onValidJSON: (obj: Record<string, unknown>) => void;
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
      onValidJSON(obj as Record<string, unknown>);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "JSON inválido";
      setError(message);
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
    (path: string, val: unknown) => {
      if (!sn) return;
      const nextData = setNestedValue(sn.data, path, val);
      onChange({ data: nextData });
    },
    [sn, onChange],
  );

  const handleValidHeaders = useCallback(
    (obj: Record<string, unknown>) => updateData("headers", obj),
    [updateData],
  );

  const appendMessage = useCallback(
    (textToInsert: string) => {
      const messageNode = sn && isNodeOfType(sn, "message") ? sn : null;
      if (!messageNode) return;
      const cur = messageNode.data.text ?? "";
      const next = (cur + (cur ? " " : "") + textToInsert).trim();
      updateData("text", next);
    },
    [sn, updateData],
  );

  const appendFlowBody = useCallback(
    (textToInsert: string) => {
      const flowNode = sn && isNodeOfType(sn, "whatsapp_flow") ? sn : null;
      if (!flowNode) return;
      const cur = flowNode.data.body ?? "";
      const next = (cur + (cur ? " " : "") + textToInsert).trim();
      updateData("body", next);
    },
    [sn, updateData],
  );

  const [templates, setTemplates] = useState<MetaTemplateSummary[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const templatesLoadedRef = useRef(false);
  const loadingTemplatesRef = useRef(false);

  const loadTemplates = useCallback(
    async (force = false) => {
      if (loadingTemplatesRef.current) return;
      if (templatesLoadedRef.current && !force) return;

      loadingTemplatesRef.current = true;
      setTemplatesLoading(true);
      setTemplatesError(null);

      try {
        const response = await authenticatedFetch("/api/meta/templates");
        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        if (!response.ok) {
          const message =
            (payload &&
              typeof payload === "object" &&
              payload !== null &&
              "error" in payload &&
              typeof (payload as { error?: unknown }).error === "string"
              ? ((payload as { error?: string }).error as string)
              : null) ??
            "No se pudieron cargar las plantillas de WhatsApp";
          throw new Error(message);
        }

        const templatesData = Array.isArray(payload)
          ? (payload as MetaTemplateSummary[])
          : [];
        setTemplates(templatesData);
        templatesLoadedRef.current = true;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Error al cargar las plantillas de WhatsApp";
        setTemplatesError(message);
        templatesLoadedRef.current = false;
        toast.error(message);
      } finally {
        loadingTemplatesRef.current = false;
        setTemplatesLoading(false);
      }
    },
    [],
  );

  const refreshTemplates = useCallback(() => {
    loadTemplates(true);
  }, [loadTemplates]);

  const name = sn?.data?.name ?? "";
  const triggerData = isNodeOfType(sn, "trigger") ? sn?.data : null;
  const messageData = isNodeOfType(sn, "message") ? sn?.data : null;
  const whatsappFlowData = isNodeOfType(sn, "whatsapp_flow") ? sn?.data : null;
  const optionsData = isNodeOfType(sn, "options") ? sn?.data : null;
  const delayData = isNodeOfType(sn, "delay") ? sn?.data : null;
  const conditionData = isNodeOfType(sn, "condition") ? sn?.data : null;
  const apiData = isNodeOfType(sn, "api") ? sn?.data : null;
  const assignData = isNodeOfType(sn, "assign") ? sn?.data : null;
  const mediaData = isNodeOfType(sn, "media") ? sn?.data : null;
  const handoffData = isNodeOfType(sn, "handoff") ? sn?.data : null;
  const gotoData = isNodeOfType(sn, "goto") ? sn?.data : null;
  const endData = isNodeOfType(sn, "end") ? sn?.data : null;

  const templateParameters = useMemo(
    () =>
      Array.isArray(messageData?.templateParameters)
        ? (messageData?.templateParameters as TemplateParameterData[])
        : [],
    [messageData?.templateParameters],
  );

  const sortedTemplates = useMemo(
    () => [...templates].sort((a, b) => a.name.localeCompare(b.name)),
    [templates],
  );

  const selectedTemplateId = useMemo(() => {
    if (!messageData?.templateName || !messageData?.templateLanguage) {
      return undefined;
    }
    const match = sortedTemplates.find(
      (template) =>
        template.name === messageData.templateName &&
        template.language === messageData.templateLanguage,
    );
    return match?.id;
  }, [
    messageData?.templateLanguage,
    messageData?.templateName,
    sortedTemplates,
  ]);

  const currentTemplate = useMemo(() => {
    if (!selectedTemplateId) return undefined;
    return sortedTemplates.find((template) => template.id === selectedTemplateId);
  }, [selectedTemplateId, sortedTemplates]);

  useEffect(() => {
    if (messageData?.useTemplate) {
      loadTemplates();
    }
  }, [messageData?.useTemplate, loadTemplates]);

  const addTemplateParameter = useCallback(() => {
    const next = [...templateParameters, { component: "BODY", type: "text", value: "" }];
    updateData("templateParameters", next);
  }, [templateParameters, updateData]);

  const handleTemplateParameterChange = useCallback(
    (index: number, partial: Partial<TemplateParameterData>) => {
      const current = [...templateParameters];
      if (!current[index]) return;
      current[index] = { ...current[index], ...partial };
      updateData("templateParameters", current);
    },
    [templateParameters, updateData],
  );

  const appendTemplateParameterValue = useCallback(
    (index: number, addition: string) => {
      const current = [...templateParameters];
      if (!current[index]) return;
      const trimmed = addition?.trim();
      if (!trimmed) return;
      const existing = current[index].value ?? "";
      const nextValue = existing ? `${existing} ${trimmed}`.trim() : trimmed;
      current[index] = { ...current[index], value: nextValue };
      updateData("templateParameters", current);
    },
    [templateParameters, updateData],
  );

  const removeTemplateParameter = useCallback(
    (index: number) => {
      const current = [...templateParameters];
      if (index < 0 || index >= current.length) return;
      current.splice(index, 1);
      updateData("templateParameters", current);
    },
    [templateParameters, updateData],
  );

  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      if (!templateId || templateId === "__none" || templateId === "__empty")
        return;
      const template = sortedTemplates.find((item) => item.id === templateId);
      if (!template) return;
      updateData("templateName", template.name);
      updateData("templateLanguage", template.language);
      updateData("templateParameters", deriveParametersFromTemplate(template));
    },
    [sortedTemplates, updateData],
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

  return (
    <Card className="h-full overflow-auto">
      <CardHeader className="sticky top-0 bg-card z-10 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-xl uppercase">
              {sn.type}
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
        {triggerData && (
          <div className="space-y-2">
            <Label>Keyword</Label>
            <Input
              value={triggerData.keyword ?? ""}
              onChange={(e) => updateData("keyword", e.target.value)}
              placeholder="/start, hola, menu..."
            />
          </div>
        )}

        {/* MESSAGE */}
        {messageData &&
          (() => {
            const text = messageData.text ?? "";
            const textLen = text.length;
            const overLimit = textLen > waTextLimit;
            const remaining = Math.max(0, waTextLimit - textLen);
            const templateValue = selectedTemplateId ?? "__none";
            const templateStatus =
              currentTemplate?.status?.toUpperCase() ?? null;
            const showStatus =
              templateStatus && templateStatus !== "APPROVED";

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Usar plantilla</Label>
                  <Switch
                    checked={!!messageData.useTemplate}
                    onCheckedChange={(v) => {
                      updateData("useTemplate", v);
                      if (v) {
                        loadTemplates();
                      }
                    }}
                  />
                </div>

                {messageData.useTemplate ? (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <Label>Plantilla de WhatsApp</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={refreshTemplates}
                        disabled={templatesLoading}
                      >
                        {templatesLoading ? (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-3.5 w-3.5" />
                        )}
                        {templatesLoading ? "Actualizando…" : "Actualizar"}
                      </Button>
                    </div>
                    <Select
                      value={templateValue}
                      onValueChange={handleTemplateSelect}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            templatesLoading
                              ? "Cargando plantillas…"
                              : "Elegí una plantilla aprobada"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none" disabled>
                          {templatesLoading
                            ? "Cargando plantillas…"
                            : "Selecciona una plantilla"}
                        </SelectItem>
                        {sortedTemplates.length > 0
                          ? sortedTemplates.map((template) => {
                              const status =
                                template.status?.toUpperCase() ?? "";
                              const disabled =
                                status && status !== "APPROVED";
                              const label = `${template.name} (${template.language})${
                                status && status !== "APPROVED"
                                  ? ` • ${status}`
                                  : ""
                              }`;
                              return (
                                <SelectItem
                                  key={template.id}
                                  value={template.id}
                                  disabled={disabled}
                                >
                                  {label}
                                </SelectItem>
                              );
                            })
                          : !templatesLoading && (
                              <SelectItem value="__empty" disabled>
                                No hay plantillas disponibles
                              </SelectItem>
                            )}
                      </SelectContent>
                    </Select>
                    {templatesError ? (
                      <p className="text-xs text-destructive">{templatesError}</p>
                    ) : null}
                    <div className="grid gap-2">
                      <Label>Nombre de la plantilla</Label>
                      <Input
                        value={messageData.templateName ?? ""}
                        onChange={(e) =>
                          updateData("templateName", e.target.value)
                        }
                        placeholder="hello_world"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Idioma de la plantilla</Label>
                      <Input
                        value={messageData.templateLanguage ?? ""}
                        onChange={(e) =>
                          updateData("templateLanguage", e.target.value)
                        }
                        placeholder="es_AR"
                      />
                    </div>
                    {showStatus ? (
                      <p className="text-xs text-muted-foreground">
                        Estado actual: {templateStatus}
                      </p>
                    ) : null}
                    {messageData.templateName &&
                    !selectedTemplateId &&
                    !templatesLoading ? (
                      <p className="text-xs text-muted-foreground">
                        Usando plantilla personalizada:{" "}
                        <span className="font-medium">
                          {messageData.templateName}
                        </span>{" "}
                        ({messageData.templateLanguage || "sin idioma"})
                      </p>
                    ) : null}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Parámetros</Label>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={addTemplateParameter}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Agregar parámetro
                        </Button>
                      </div>
                      {templateParameters.length ? (
                        <div className="space-y-2">
                          {templateParameters.map((param, index) => (
                            <div
                              key={`${param.component}-${index}`}
                              className="space-y-2 rounded-lg border p-3"
                            >
                              <div className="flex flex-col gap-2 md:flex-row md:items-start">
                                <div className="grid w-full gap-2 md:grid-cols-3">
                                  <div className="space-y-1">
                                    <Label>Componente</Label>
                                    <Select
                                      value={param.component ?? "BODY"}
                                      onValueChange={(value) =>
                                        handleTemplateParameterChange(index, {
                                          component: value,
                                        })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="BODY" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {TEMPLATE_COMPONENT_OPTIONS.map(
                                          (option) => (
                                            <SelectItem
                                              key={option.value}
                                              value={option.value}
                                            >
                                              {option.label}
                                            </SelectItem>
                                          ),
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1">
                                    <Label>Subtipo</Label>
                                    <Input
                                      value={param.subType ?? ""}
                                      onChange={(e) =>
                                        handleTemplateParameterChange(index, {
                                          subType: e.target.value,
                                        })
                                      }
                                      placeholder={
                                        (param.component ?? "").toUpperCase() ===
                                        "BUTTON"
                                          ? "URL, QUICK_REPLY…"
                                          : "Opcional"
                                      }
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label>Índice</Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      value={
                                        typeof param.index === "number"
                                          ? param.index
                                          : ""
                                      }
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        handleTemplateParameterChange(index, {
                                          index:
                                            raw === ""
                                              ? undefined
                                              : Number(raw),
                                        });
                                      }}
                                      placeholder="0"
                                    />
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="self-start md:mt-6"
                                  onClick={() => removeTemplateParameter(index)}
                                  title="Eliminar parámetro"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="space-y-1">
                                <Label>Valor</Label>
                                <Textarea
                                  value={param.value ?? ""}
                                  onChange={(e) =>
                                    handleTemplateParameterChange(index, {
                                      value: e.target.value,
                                    })
                                  }
                                  placeholder="Ej: {{ name }}"
                                />
                                <div className="flex justify-end">
                                  <VarHelpers
                                    onInsert={(tpl) =>
                                      appendTemplateParameterValue(index, tpl)
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No hay parámetros configurados. Usá “Agregar parámetro”
                          si tu plantilla los requiere.
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>
                      {messageData.useTemplate
                        ? "Texto (vista previa opcional)"
                        : "Texto"}
                    </Label>
                    <Badge variant={overLimit ? "destructive" : "secondary"}>
                      {textLen}/{waTextLimit}{" "}
                      {overLimit ? "• Excede" : `• Restan ${remaining}`}
                    </Badge>
                  </div>
                  <Textarea
                    className="min-h-[140px]"
                    value={text}
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
            );
          })()}

        {/* WHATSAPP FLOW */}
        {whatsappFlowData &&
          (() => {
            const body = whatsappFlowData.body ?? "";
            const limit = 1024;
            const bodyLen = body.length;
            const overLimit = bodyLen > limit;
            return (
              <div className="space-y-3">
                <div className="grid gap-2">
                  <Label>Header (opcional)</Label>
                  <Input
                    value={whatsappFlowData.header ?? ""}
                    onChange={(event) => updateData("header", event.target.value)}
                    placeholder="Ej: Confirmá tus datos"
                    maxLength={60}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Mensaje del Flow</Label>
                    <Badge variant={overLimit ? "destructive" : "secondary"}>
                      {bodyLen}/{limit}
                      {overLimit ? " • Excede" : ""}
                    </Badge>
                  </div>
                  <Textarea
                    className="min-h-[140px]"
                    value={body}
                    onChange={(event) => updateData("body", event.target.value)}
                    placeholder="Te voy a redirigir a un Flow para completar la información."
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Podés usar variables como {"{{ name }}"}.</span>
                    <VarHelpers onInsert={appendFlowBody} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Footer (opcional)</Label>
                  <Input
                    value={whatsappFlowData.footer ?? ""}
                    onChange={(event) => updateData("footer", event.target.value)}
                    placeholder="Ej: Vas a recibir una confirmación"
                    maxLength={60}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Texto del botón (CTA)</Label>
                  <Input
                    value={whatsappFlowData.cta ?? ""}
                    onChange={(event) => updateData("cta", event.target.value)}
                    placeholder="Abrir Flow"
                    maxLength={40}
                  />
                </div>
              </div>
            );
          })()}

        {/* OPTIONS */}
        {optionsData && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Options</Label>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const next = [...(optionsData.options ?? []), "New Option"];
                  updateData("options", next);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add option
              </Button>
            </div>

            <div className="space-y-2">
              {(optionsData.options ?? []).map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={opt}
                    onChange={(e) => {
                        const currentOptions = optionsData.options ?? [];
                        const next = [...currentOptions];
                        next[i] = e.target.value;
                        updateData("options", next);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const next = [...(optionsData.options ?? []), ""];
                          updateData("options", next);
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      title="Delete option"
                      onClick={() => {
                        const currentOptions = optionsData.options ?? [];
                        const next = [...currentOptions];
                        next.splice(i, 1);
                        updateData("options", next);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              }

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
                  const next = [...(optionsData.options ?? []), ...lines];
                  updateData("options", next);
                }}
              />
            </div>
          </div>
        )}

        {/* DELAY */}
        {delayData && (
          <div className="space-y-2">
            <Label>Seconds</Label>
            <Slider
              value={[delayData.seconds ?? 1]}
              min={1}
              max={3600}
              step={1}
              onValueChange={([v]) => updateData("seconds", v)}
            />
            <div className="text-xs text-muted-foreground">
              {delayData.seconds ?? 1}
              s
            </div>
          </div>
        )}

        {/* CONDITION */}
        {conditionData && (
          <div className="space-y-2">
            <Label>Expression</Label>
            <Textarea
              value={conditionData.expression ?? ""}
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
        {apiData && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Method</Label>
                <Select
                  value={(apiData.method ?? "POST").toUpperCase()}
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
                  value={apiData.assignTo || "apiResult"}
                  onChange={(e) => updateData("assignTo", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>URL</Label>
              <Input
                value={apiData.url || ""}
                onChange={(e) => updateData("url", e.target.value)}
                placeholder="https://api.example.com/resource"
                inputMode="url"
              />
            </div>

            <HeaderJSONField
              value={apiData.headers as Record<string, unknown> | undefined}
              onValidJSON={handleValidHeaders}
            />

            <div className="space-y-1">
              <Label>Body</Label>
              <Textarea
                value={apiData.body || ""}
                onChange={(e) => updateData("body", e.target.value)}
                placeholder='{"id": "{{ order_id }}"}'
                className="font-mono min-h-[120px]"
                spellCheck={false}
              />
            </div>
          </div>
        )}

        {/* ASSIGN */}
        {assignData && (
          <div className="space-y-2">
            <Label>Key</Label>
            <Input
              value={assignData.key || ""}
              onChange={(e) => updateData("key", e.target.value)}
              placeholder="context.customer_name"
            />
            <Label>Value</Label>
            <Input
              value={assignData.value || ""}
              onChange={(e) => updateData("value", e.target.value)}
              placeholder="{{ name }}"
            />
          </div>
        )}

        {/* MEDIA */}
        {mediaData && (
          <div className="space-y-2">
            <Label>Media URL</Label>
            <Input
              value={mediaData.url || ""}
              onChange={(e) => updateData("url", e.target.value)}
              inputMode="url"
            />
            <Label>Type</Label>
            <Input
              value={mediaData.mediaType || "image"}
              onChange={(e) => updateData("mediaType", e.target.value)}
              placeholder="image | video | audio | document"
            />
            <Label>Caption</Label>
            <Input
              value={mediaData.caption || ""}
              onChange={(e) => updateData("caption", e.target.value)}
              placeholder="Texto opcional…"
            />
          </div>
        )}

        {/* HANDOFF */}
        {handoffData && (
          <div className="space-y-2">
            <Label>Queue</Label>
            <Input
              value={handoffData.queue || ""}
              onChange={(e) => updateData("queue", e.target.value)}
            />
            <Label>Note</Label>
            <Input
              value={handoffData.note || ""}
              onChange={(e) => updateData("note", e.target.value)}
            />
          </div>
        )}

        {/* GOTO */}
        {gotoData && (
          <div className="space-y-2">
            <Label>Target Node ID</Label>
            <Input
              value={gotoData.targetNodeId || ""}
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
        {endData && (
          <div className="space-y-2">
            <Label>Reason</Label>
            <Input
              value={endData.reason || "end"}
              onChange={(e) => updateData("reason", e.target.value)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
