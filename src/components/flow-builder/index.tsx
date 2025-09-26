"use client";
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ReactFlow,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
  MarkerType,
  SelectionMode,
} from "reactflow";
import type {
  Connection,
  Node,
  NodeProps,
  NodeTypes,
  OnSelectionChangeParams,
  NodeMouseHandler,
  ReactFlowInstance,
  Viewport,
} from "reactflow";
import "reactflow/dist/style.css";
import { toast } from "sonner";
import { Download, Rocket, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  BaseDataSchema,
  TriggerDataSchema,
  MessageDataSchema,
  OptionsDataSchema,
  DelayDataSchema,
  ConditionDataSchema,
  APICallDataSchema,
  AssignVarDataSchema,
  MediaDataSchema,
  HandoffDataSchema,
  EndDataSchema,
  waTextLimit,
  isFlowNodeType,
  isNodeOfType,
} from "./types";
import type {
  FlowBuilderHandle,
  FlowData,
  FlowEdge,
  FlowNode,
  FlowNodeDataMap,
  FlowNodeType,
} from "./types";
import { getLayoutedElements, makeId, getStarterData } from "./helpers";
import { nodeTypes } from "./nodes";
import { Inspector } from "./Inspector";
import { Simulator } from "./Simulator";
import { Topbar } from "./Toolbar";
import { Palette } from "./Palette";
import { z } from "zod";
import { sanitizeFlowDefinition } from "@/lib/flow-schema";
import { BackgroundVariant } from "@reactflow/background";
import type { GetMiniMapNodeAttribute } from "@reactflow/minimap";
import { DraftsDialog } from "./DraftsDialog";
import type { DraftSummary } from "./DraftsDialog";

export type { FlowBuilderHandle, FlowData } from "./types";

type FlowBuilderProps = {
  initialFlow?: Partial<FlowData> | null;
};
type ImportEvent =
  | React.ChangeEvent<HTMLInputElement>
  | { target?: { files?: FileList | File[] | null; value?: string } };
type NodeCommonHandlers = {
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCopyWebhook: () => void;
  onCopyId: () => void;
};
type NodeRenderer = (
  props: NodeProps<FlowNode["data"]> & NodeCommonHandlers,
) => React.ReactNode;
const defaultNodes: FlowNode[] = [
  {
    id: "n1",
    type: "trigger",
    position: { x: 0, y: 0 },
    data: { name: "Comienzo", keyword: "Hola" },
  },
  {
    id: "n2",
    type: "message",
    position: { x: 0, y: 160 },
    data: {
      name: "Bienvenida",
      text: "Bienvenido! ¿Cómo puedo ayudarte?",
      useTemplate: false,
    },
  },
  {
    id: "n3",
    type: "options",
    position: { x: 0, y: 320 },
    data: {
      name: "Menú Principal",
      options: ["Soporte", "Ventas", "Información"],
    },
  },
  {
    id: "n4",
    type: "end",
    position: { x: -220, y: 520 },
    data: { name: "Fin", reason: "fin del flujo" },
  },
];

const defaultEdges: FlowEdge[] = [
  {
    id: "e1-2",
    source: "n1",
    target: "n2",
    markerEnd: { type: MarkerType.ArrowClosed },
    type: "smoothstep",
  },
  {
    id: "e2-3",
    source: "n2",
    target: "n3",
    markerEnd: { type: MarkerType.ArrowClosed },
    type: "smoothstep",
  },
];

const DRAFT_KEY = "flowbuilder_draft_v1";
const SAVED_DRAFTS_KEY = "flowbuilder_saved_drafts_v1";

const DraftSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  updatedAt: z.string().min(1),
  flow: z.unknown(),
});

type StoredDraft = {
  id: string;
  name: string;
  updatedAt: string;
  flow: FlowData;
};

const parseDrafts = (value: unknown): StoredDraft[] => {
  if (!Array.isArray(value)) return [];
  const drafts: StoredDraft[] = [];
  value.forEach((entry) => {
    try {
      const parsed = DraftSchema.parse(entry);
      const sanitizedFlow = sanitizeFlowDefinition(parsed.flow);
      drafts.push({
        id: parsed.id,
        name: parsed.name,
        updatedAt: new Date(parsed.updatedAt).toISOString(),
        flow: sanitizedFlow,
      });
    } catch {
      // ignoramos entradas inválidas
    }
  });
  return drafts;
};

const deepClone = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map((item) => deepClone(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        deepClone(val),
      ]),
    );
  }
  return value;
};

const toFlowState = (
  definition: FlowData,
): { nodes: FlowNode[]; edges: FlowEdge[] } => {
  const sanitized = sanitizeFlowDefinition(definition);
  const nextNodes = sanitized.nodes.map((node) => ({
    ...node,
    data: deepClone(node.data ?? {}) as FlowNode["data"],
    position: {
      x: typeof node.position?.x === "number" ? node.position.x : 0,
      y: typeof node.position?.y === "number" ? node.position.y : 0,
    },
  })) as FlowNode[];
  const nextEdges = sanitized.edges.map((edge) => ({
    ...edge,
  })) as FlowEdge[];

  return { nodes: nextNodes, edges: nextEdges };
};

const FlowBuilder = React.forwardRef<FlowBuilderHandle, FlowBuilderProps>(
  ({ initialFlow }, ref) => {
    const [nodes, setNodes, onNodesChange] =
      useNodesState<FlowNode["data"]>(defaultNodes);
    const [edges, setEdges, onEdgesChange] =
      useEdgesState<FlowEdge>(defaultEdges);
    const [selected, setSelected] = useState<FlowNode | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [zoomLevel, setZoomLevel] = useState<number | undefined>(undefined);
    const [dirty, setDirty] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
    const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
    const [currentDraftName, setCurrentDraftName] = useState<string | null>(null);
    const [drafts, setDrafts] = useState<StoredDraft[]>([]);
    const [draftDialogOpen, setDraftDialogOpen] = useState(false);
    const [savingDraft, setSavingDraft] = useState(false);
    const rfRef = useRef<ReactFlowInstance<FlowNode, FlowEdge> | null>(null);
    const historyRef = useRef<{ past: string[]; future: string[] }>({
      past: [],
      future: [],
    });
    const didRestoreRef = useRef(false);
    const lastSavedSnapshotRef = useRef<string | null>(null);

    const cloneNode = useCallback(
      (node: Node): FlowNode => {
        if (!node.type || !isFlowNodeType(node.type)) {
          throw new Error(`Invalid node type: ${String(node.type)}`);
        }

        return {
          ...node,
          type: node.type,
          data: deepClone(node.data ?? {}) as FlowNode["data"],
          position: {
            x: typeof node.position?.x === "number" ? node.position.x : 0,
            y: typeof node.position?.y === "number" ? node.position.y : 0,
          },
        };
      },
      [],
    );

    const toFlowNode = useCallback(
      (node?: Node | FlowNode | null): FlowNode | null => {
        if (!node) return null;
        const nodeType = node.type;
        if (!nodeType || !isFlowNodeType(nodeType)) return null;
        return node as FlowNode;
      },
      [],
    );

    const applyFlow = useCallback(
      (flow: unknown) => {
        const { nodes: nextNodes, edges: nextEdges } = toFlowState(
          sanitizeFlowDefinition(flow),
        );

        historyRef.current.past = [];
        historyRef.current.future = [];
        setNodes(nextNodes);
        setEdges(nextEdges);
        setSelected(null);
        setSelectedIds([]);

        requestAnimationFrame(() => rfRef.current?.fitView?.({ padding: 0.2 }));
      },
      [setEdges, setNodes, setSelected, setSelectedIds],
    );

    useEffect(() => {
      if (typeof window === "undefined") return;
      try {
        const raw = localStorage.getItem(SAVED_DRAFTS_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const stored = parseDrafts(parsed);
        if (stored.length) {
          setDrafts(stored);
        }
      } catch {
        // ignore drafts corruptos
      }
    }, []);

    useEffect(() => {
      try {
        const payload = JSON.stringify(drafts);
        localStorage.setItem(SAVED_DRAFTS_KEY, payload);
      } catch {
        // ignore
      }
    }, [drafts]);

    // Load initial flow or draft once
    useEffect(() => {
      if (initialFlow?.nodes && initialFlow?.edges) {
        const sanitized = sanitizeFlowDefinition(initialFlow);
        applyFlow(sanitized);
        const snapshot = JSON.stringify(sanitized);
        lastSavedSnapshotRef.current = snapshot;
        setDirty(false);
        setLastSavedAt(null);
        setCurrentDraftId(null);
        setCurrentDraftName(null);
        didRestoreRef.current = true;
        return;
      }

      if (didRestoreRef.current) return;

      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const parsed = sanitizeFlowDefinition(JSON.parse(raw));
        applyFlow(parsed);
        const snapshot = JSON.stringify(parsed);
        lastSavedSnapshotRef.current = snapshot;
        setDirty(false);
        setLastSavedAt(null);
        setCurrentDraftId(null);
        setCurrentDraftName(null);
      } catch {
        // ignore drafts con errores
      } finally {
        didRestoreRef.current = true;
      }
    }, [applyFlow, initialFlow]);

    // Expose ref API
    useImperativeHandle(ref, () => ({
      getFlowData: () => sanitizeFlowDefinition({ nodes, edges }),
    }));

    // Autosave draft + track cambios
    useEffect(() => {
      const sanitized = sanitizeFlowDefinition({ nodes, edges });
      const snapshot = JSON.stringify(sanitized);

      try {
        localStorage.setItem(DRAFT_KEY, snapshot);
      } catch {
        // ignore
      }

      if (lastSavedSnapshotRef.current === null) {
        setDirty(true);
      } else {
        setDirty(lastSavedSnapshotRef.current !== snapshot);
      }
    }, [nodes, edges]);

    // add node
    const addNode = useCallback(
      (type: FlowNodeType) => {
        const id = makeId();
        const last = nodes.at(-1);
        const position = {
          x: last?.position?.x ?? 0,
          y: (last?.position?.y ?? 0) + 140,
        };
        const data: Partial<FlowNodeDataMap[typeof type]> = {
          name: `${type}-${id}`,
          ...getStarterData(type),
        };
        const newNode: FlowNode = { id, type, data, position };
        setNodes((nds) => nds.concat(newNode));
        setSelected(newNode);
        setSelectedIds([id]);
      },
      [nodes, setNodes, setSelected, setSelectedIds],
    );

    // Prevent invalid / duplicate connections
    const onConnect = useCallback(
      (params: Connection) =>
        setEdges((eds) => {
          if (
            !params.source ||
            !params.target ||
            params.source === params.target
          )
            return eds;
          if (
            eds.some(
              (e) =>
                e.source === params.source &&
                e.target === params.target &&
                e.sourceHandle === params.sourceHandle,
            )
          ) {
            toast.message("Conexión ya existente");
            return eds;
          }
          return addEdge(
            {
              ...params,
              type: "smoothstep",
              markerEnd: { type: MarkerType.ArrowClosed },
            },
            eds,
          );
        }),
      [setEdges],
    );

    const onNodeClick: NodeMouseHandler = (_event, node) =>
      setSelected(toFlowNode(node));
    const onPaneClick = () => setSelected(null);

    const handleEdit = useCallback(
      (nodeId: string) => {
        const found = toFlowNode(nodes.find((node) => node.id === nodeId));
        setSelected(found);
        if (found) {
          setSelectedIds([nodeId]);
        }
      },
      [nodes, setSelected, setSelectedIds, toFlowNode],
    );
    const handleDuplicate = useCallback(
      (nodeId: string) => {
        const source = nodes.find((node) => node.id === nodeId);
        if (!source || !source.type || !isFlowNodeType(source.type)) return;
        const id = makeId();
        const base = cloneNode(source);
        const duplicate: FlowNode = {
          ...base,
          id,
          position: {
            x: (base.position?.x ?? 0) + 20,
            y: (base.position?.y ?? 0) + 20,
          },
          selected: false,
        };
        setNodes((nds) => nds.concat(duplicate));
        setSelected(duplicate);
        setSelectedIds([id]);
      },
      [cloneNode, nodes, setNodes, setSelected, setSelectedIds],
    );

    const handleDelete = useCallback(
      (nodeId: string) => {
        setNodes((nds) => nds.filter((n) => n.id !== nodeId));
        setEdges((eds) =>
          eds.filter((ed) => ed.source !== nodeId && ed.target !== nodeId),
        );
        setSelected(null);
        setSelectedIds((ids) => ids.filter((id) => id !== nodeId));
      },
      [setNodes, setEdges, setSelectedIds],
    );

    const safeWriteClipboard = useCallback(async (text: string, ok: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(ok);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "true");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        ta.style.pointerEvents = "none";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
          toast.success(ok);
        } finally {
          document.body.removeChild(ta);
        }
      }
    }, []);

    const handleCopyWebhook = useCallback(
      (nodeId: string) => {
        const webhookUrl = `${window.location.origin}/api/webhook?flowId=${nodeId}`;
        safeWriteClipboard(
          webhookUrl,
          "URL del webhook copiada al portapapeles!",
        );
      },
      [safeWriteClipboard],
    );

    const handleCopyId = useCallback(
      (nodeId: string) => {
        safeWriteClipboard(nodeId, "ID copiado al portapapeles!");
      },
      [safeWriteClipboard],
    );

    const handleCreateNew = useCallback(() => {
      applyFlow({ nodes: defaultNodes, edges: defaultEdges });
      lastSavedSnapshotRef.current = null;
      setDirty(true);
      setLastSavedAt(null);
      setCurrentDraftId(null);
      setCurrentDraftName(null);
      toast.message("Nuevo flujo creado");
    }, [applyFlow]);

    const handleSaveDraft = useCallback(
      async ({ id, name }: { id?: string | null; name: string }) => {
        const trimmed = name.trim();
        const safeName = trimmed.length ? trimmed : "Flujo sin título";
        setSavingDraft(true);
        try {
          const sanitized = sanitizeFlowDefinition({ nodes, edges });
          const snapshot = JSON.stringify(sanitized);
          const draftId = id ?? currentDraftId ?? makeId();
          const now = new Date().toISOString();
          const nextDraft: StoredDraft = {
            id: draftId,
            name: safeName,
            updatedAt: now,
            flow: sanitized,
          };

          setDrafts((prev) => {
            const exists = prev.findIndex((draft) => draft.id === draftId);
            if (exists === -1) return [...prev, nextDraft];
            const copy = prev.slice();
            copy[exists] = nextDraft;
            return copy;
          });

          lastSavedSnapshotRef.current = snapshot;
          setDirty(false);
          setLastSavedAt(now);
          setCurrentDraftId(draftId);
          setCurrentDraftName(safeName);
          toast.success(`Borrador “${safeName}” guardado`);
          return true;
        } catch (error) {
          console.error(error);
          toast.error("No se pudo guardar el borrador");
          return false;
        } finally {
          setSavingDraft(false);
        }
      },
      [currentDraftId, edges, nodes],
    );

    const handleQuickSave = useCallback(async () => {
      if (!currentDraftId || !currentDraftName) {
        toast.message("Elegí un nombre para guardar tu primer borrador");
        setDraftDialogOpen(true);
        return;
      }
      await handleSaveDraft({ id: currentDraftId, name: currentDraftName });
    }, [currentDraftId, currentDraftName, handleSaveDraft]);

    const handleLoadDraft = useCallback(
      (draftId: string) => {
        const found = drafts.find((draft) => draft.id === draftId);
        if (!found) {
          toast.error("No se encontró el borrador seleccionado");
          return;
        }
        const sanitized = sanitizeFlowDefinition(found.flow);
        applyFlow(sanitized);
        const snapshot = JSON.stringify(sanitized);
        lastSavedSnapshotRef.current = snapshot;
        setDirty(false);
        setLastSavedAt(found.updatedAt);
        setCurrentDraftId(found.id);
        setCurrentDraftName(found.name);
        setDraftDialogOpen(false);
        toast.success(`Borrador “${found.name}” cargado`);
      },
      [applyFlow, drafts],
    );

    const handleDeleteDraft = useCallback(
      (draftId: string) => {
        const target = drafts.find((draft) => draft.id === draftId);
        if (!target) return;
        if (typeof window !== "undefined") {
          const confirmed = window.confirm(
            `¿Eliminar el borrador “${target.name}”?`,
          );
          if (!confirmed) return;
        }
        setDrafts((prev) => prev.filter((draft) => draft.id !== draftId));
        if (currentDraftId === draftId) {
          lastSavedSnapshotRef.current = null;
          setLastSavedAt(null);
          setCurrentDraftId(null);
          setCurrentDraftName(null);
          setDirty(true);
        }
        toast.success(`Borrador “${target.name}” eliminado`);
      },
      [currentDraftId, drafts],
    );

    const updateSelected = useCallback(
      (patch: { data: FlowNode["data"] }) => {
        setSelected((current) => {
          if (!current) return current;

          const nextData = {
            ...current.data,
            ...patch.data,
          } as FlowNode["data"];
          const nextNode: FlowNode = { ...current, data: nextData };
          setNodes((nodesState) =>
            nodesState.map((node) =>
              node.id === current.id ? nextNode : node,
            ),
          );

          if (current.type === "options") {
            const optionsUpdate = (
              patch.data as Partial<FlowNodeDataMap["options"]>
            ).options;
            if (!Array.isArray(optionsUpdate)) {
              return nextNode;
            }
            const handles = new Set(
              optionsUpdate.map((_, index) => `opt-${index}`),
            );
            handles.add("no-match");
            setEdges((edgeState) =>
              edgeState.filter(
                (edge) =>
                  !(
                    edge.source === current.id &&
                    edge.sourceHandle &&
                    !handles.has(edge.sourceHandle)
                  ),
              ),
            );
          }

          return nextNode;
        });
      },
      [setEdges, setNodes],
    );

    const onDrop = useCallback(
      (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const type = e.dataTransfer.getData("application/wa-node");
        if (!isFlowNodeType(type)) return;
        const bounds = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const projected = rfRef.current?.project?.({
          x: e.clientX - bounds.left,
          y: e.clientY - bounds.top,
        });
        const position = projected ?? { x: 0, y: 0 };
        const id = makeId();
        const starter = getStarterData(type);
        const data = {
          name: `${type}-${id}`,
          ...starter,
        } as FlowNodeDataMap[typeof type];
        const newNode: FlowNode = {
          id,
          type,
          position,
          data,
        };
        setNodes((nds) => nds.concat(newNode));
        setSelected(newNode);
        setSelectedIds([id]);
      },
      [setNodes, setSelected, setSelectedIds],
    );

    const onDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }, []);

    // import / export
    const handleImport = useCallback(
      async (event: ImportEvent) => {
        const fileList = event?.target?.files;
        const file =
          fileList && "item" in fileList
            ? fileList.item(0)
            : Array.isArray(fileList)
              ? fileList[0]
              : fileList?.[0];

        if (!file) {
          toast.error("Seleccioná un archivo .json válido");
          return;
        }

        try {
          const text = await file.text();
          const parsed = sanitizeFlowDefinition(JSON.parse(text));
          applyFlow(parsed);
          lastSavedSnapshotRef.current = null;
          setDirty(true);
          setLastSavedAt(null);
          setCurrentDraftId(null);
          setCurrentDraftName(null);
          toast.success(`Flujo importado${file.name ? ` (${file.name})` : ""}`);
        } catch {
          toast.error("Error al importar: archivo inválido");
        } finally {
          const target = event?.target as HTMLInputElement | undefined;
          if (target) {
            target.value = "";
          }
        }
      },
      [applyFlow],
    );

    const handleExport = useCallback(() => {
      const payload = JSON.stringify(
        sanitizeFlowDefinition({ nodes, edges }),
        null,
        2,
      );
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `whatsapp-flow-${new Date().toISOString().slice(0, 19)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }, [nodes, edges]);

    // validation
    const validate = () => {
      const issues: { message: string; nodeId?: string }[] = [];
      const triggers = nodes
        .map((node) => toFlowNode(node))
        .filter((n): n is FlowNode<"trigger"> => n?.type === "trigger");
      const triggerKeys = triggers
        .map((t) =>
          typeof t.data.keyword === "string" ? t.data.keyword : "",
        )
        .map((keyword) => keyword.toLowerCase().trim())
        .filter((value): value is string => value.length > 0);
      const seenKeywords = new Set<string>();
      triggerKeys.forEach((keyword) => {
        if (seenKeywords.has(keyword)) {
          const culprit = triggers.find((t) => {
            const value =
              typeof t.data.keyword === "string"
                ? t.data.keyword.toLowerCase().trim()
                : "";
            return value === keyword;
          });
          issues.push({
            message: `Palabra clave de disparador duplicada: “${keyword}”`,
            nodeId: culprit?.id,
          });
        }
        seenKeywords.add(keyword);
      });
      if (!triggers.length)
        issues.push({
          message: "El flujo necesita al menos un nodo trigger",
        });

      nodes.forEach((candidate) => {
        const n = toFlowNode(candidate);
        if (!n) return;

        try {
          switch (n.type) {
            case "trigger":
              TriggerDataSchema.parse(n.data);
              break;
            case "message":
              MessageDataSchema.parse(n.data);
              break;
            case "options":
              OptionsDataSchema.parse(n.data);
              break;
            case "delay":
              DelayDataSchema.parse(n.data);
              break;
            case "condition":
              ConditionDataSchema.parse(n.data);
              break;
            case "api":
              APICallDataSchema.parse(n.data);
              break;
            case "assign":
              AssignVarDataSchema.parse(n.data);
              break;
            case "media":
              MediaDataSchema.parse(n.data);
              break;
            case "handoff":
              HandoffDataSchema.parse(n.data);
              break;
            case "goto":
              BaseDataSchema.extend({ targetNodeId: z.string().min(1) }).parse(
                n.data,
              );
              break;
            case "end":
              EndDataSchema.parse(n.data);
              break;
          }
        } catch (e) {
          issues.push({
            message: `${n.id} (${n.type}): ${String(e)}`,
            nodeId: n.id,
          });
        }
        const outgoingFromNode = edges.filter((e) => e.source === n.id);
        if (n.type !== "end" && outgoingFromNode.length === 0) {
          if (n.type !== "options" && n.type !== "condition") {
            issues.push({
              message: `${n.id}: sin conexión de salida`,
              nodeId: n.id,
            });
          }
        }
        if (n.type !== "trigger" && !edges.some((e) => e.target === n.id)) {
          issues.push({
            message: `${n.id}: inaccesible (sin conexión entrante)`,
            nodeId: n.id,
          });
        }

        if (isNodeOfType(n, "options")) {
          const opts = Array.isArray(n.data?.options) ? n.data.options : [];
          const missing: string[] = [];
          opts.forEach((_option: string, idx: number) => {
            if (
              !outgoingFromNode.some((e) => e.sourceHandle === `opt-${idx}`)
            ) {
              missing.push(`#${idx + 1}`);
            }
          });
          if (!outgoingFromNode.some((e) => e.sourceHandle === "no-match")) {
            missing.push("No Match");
          }
          if (missing.length) {
            issues.push({
              message: `${n.id}: opciones sin salida (${missing.join(", ")})`,
              nodeId: n.id,
            });
          }
        }

        if (n.type === "condition") {
          const hasTrue = outgoingFromNode.some(
            (e) => e.sourceHandle === "true",
          );
          const hasFalse = outgoingFromNode.some(
            (e) => e.sourceHandle === "false",
          );
          if (!hasTrue || !hasFalse) {
            const missing = [
              !hasTrue ? '"true"' : null,
              !hasFalse ? '"false"' : null,
            ]
              .filter(Boolean)
              .join(", ");
            issues.push({
              message: `${n.id}: condición sin rama ${missing}`,
              nodeId: n.id,
            });
          }
        }

        if (isNodeOfType(n, "goto")) {
          const targetId = n.data?.targetNodeId ?? "";
          if (
            targetId &&
            !nodes.some((candidate) => candidate.id === targetId)
          ) {
            issues.push({
              message: `${n.id}: destino ${targetId} inexistente`,
              nodeId: n.id,
            });
          }
        }
      });

      if (issues.length) {
        const [first, ...rest] = issues;
        if (first.nodeId) {
          const target = nodes.find((candidate) => candidate.id === first.nodeId);
          const flowNode = toFlowNode(target);
          if (flowNode) {
            setSelected(flowNode);
            setSelectedIds([flowNode.id]);
          }
        }
        const suffix = first.nodeId ? ` (Nodo: ${first.nodeId})` : "";
        toast.error(`${first.message}${suffix}`);
        rest.forEach((issue) => {
          const restSuffix = issue.nodeId ? ` (Nodo: ${issue.nodeId})` : "";
          toast.error(`${issue.message}${restSuffix}`);
        });
        return false;
      }
      toast.success("Todo bien! El flujo parece válido.");
      return true;
    };

    // auto layout
    const doAutoLayout = () => {
      const layout = getLayoutedElements(nodes, edges, "TB", {
        translateToOrigin: true,
        snapToGrid: 8,
      });
      setNodes(layout.nodes);
      setEdges(layout.edges);
      requestAnimationFrame(() => rfRef.current?.fitView?.({ padding: 0.2 }));
    };

    // undo / redo (snapshot stack)
    useEffect(() => {
      const snapshot = JSON.stringify(sanitizeFlowDefinition({ nodes, edges }));
      const past = historyRef.current.past;
      if (past[past.length - 1] === snapshot) return;
      historyRef.current.past = [...past, snapshot].slice(-200);
      historyRef.current.future = [];
    }, [nodes, edges]);

    const undo = useCallback(() => {
      const past = historyRef.current.past;
      if (past.length <= 1) return;
      const current = past.pop();
      if (current) historyRef.current.future.push(current);
      const prev = sanitizeFlowDefinition(JSON.parse(past[past.length - 1]));
      const { nodes: prevNodes, edges: prevEdges } = toFlowState(prev);
      setNodes(prevNodes);
      setEdges(prevEdges);
      setSelected(null);
      setSelectedIds([]);
    }, [setEdges, setNodes, setSelected, setSelectedIds]);

    const redo = useCallback(() => {
      const next = historyRef.current.future.pop();
      if (!next) return;
      historyRef.current.past.push(next);
      const state = sanitizeFlowDefinition(JSON.parse(next));
      const { nodes: nextNodes, edges: nextEdges } = toFlowState(state);
      setNodes(nextNodes);
      setEdges(nextEdges);
      setSelected(null);
      setSelectedIds([]);
    }, [setEdges, setNodes, setSelected, setSelectedIds]);

    // keyboard shortcuts
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        const targetElement = e.target as HTMLElement | null;
        const tag = targetElement?.tagName?.toLowerCase();
        const typing =
          tag === "input" ||
          tag === "textarea" ||
          targetElement?.isContentEditable === true;

        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          if (e.shiftKey) handleExport();
          else void handleQuickSave();
        }
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        }
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
          e.preventDefault();
          redo();
        }
        if ((e.key === "Delete" || e.key === "Backspace") && !typing) {
          if (selectedIds.length) {
            setNodes((nds) => nds.filter((n) => !selectedIds.includes(n.id)));
            setEdges((eds) =>
              eds.filter(
                (ed) =>
                  !selectedIds.includes(ed.source) &&
                  !selectedIds.includes(ed.target),
              ),
            );
            setSelected(null);
            setSelectedIds([]);
          } else if (selected?.id) {
            setNodes((nds) => nds.filter((n) => n.id !== selected.id));
            setEdges((eds) =>
              eds.filter(
                (ed) => ed.source !== selected.id && ed.target !== selected.id,
              ),
            );
            setSelected(null);
          }
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [
      selected,
      selectedIds,
      setNodes,
      setEdges,
      handleExport,
      undo,
      redo,
      handleQuickSave,
    ]);

    // zoom controls
    const zoomIn = () => rfRef.current?.zoomIn?.();
    const zoomOut = () => rfRef.current?.zoomOut?.();
    const fitView = () => rfRef.current?.fitView?.();

    // export to WA spec (outline)
    const exportForWhatsApp = () => {
      const definition = sanitizeFlowDefinition({ nodes, edges });
      const spec = {
        version: 1,
        ...definition,
        notes:
          "Exported for WA; map 'message' to /messages endpoint bodies; 'media' to media messages; 'options' to interactive quick replies, etc.",
      };
      const blob = new Blob([JSON.stringify(spec, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "whatsapp-cloud-spec.json";
      a.click();
      URL.revokeObjectURL(url);
    };

    const memoizedNodeTypes = useMemo<NodeTypes>(() => {
      const wrapped: Partial<NodeTypes> = {};
      const entries = Object.entries(nodeTypes) as [
        FlowNodeType,
        NodeRenderer,
      ][];
      entries.forEach(([key, Component]) => {
        wrapped[key] = (props: NodeProps<FlowNode["data"]>) => (
          <Component
            {...props}
            onEdit={() => handleEdit(props.id)}
            onDuplicate={() => handleDuplicate(props.id)}
            onDelete={() => handleDelete(props.id)}
            onCopyWebhook={() => handleCopyWebhook(props.id)}
            onCopyId={() => handleCopyId(props.id)}
          />
        );
      });
      return wrapped as NodeTypes;
    }, [
      handleCopyId,
      handleCopyWebhook,
      handleDelete,
      handleDuplicate,
      handleEdit,
    ]);

    const lastSelIdsRef = useRef<string[]>([]);
    const shallowEqual = (a: string[], b: string[]) =>
      a.length === b.length && a.every((id, i) => id === b[i]);

    const handleSelectionChange = useCallback(
      (selection: OnSelectionChangeParams | null) => {
        const ids = (selection?.nodes ?? []).map((node) => node.id);
        if (shallowEqual(ids, lastSelIdsRef.current)) return;
        lastSelIdsRef.current = ids;
        setSelectedIds(ids);

        if (ids.length) {
          const first = toFlowNode(nodes.find((node) => node.id === ids[0]));
          setSelected(first);
        } else {
          setSelected(null);
        }
      },
      [nodes, toFlowNode],
    );

    const simulatorNodes = useMemo(
      () =>
        nodes
          .map((node) => toFlowNode(node))
          .filter((node): node is FlowNode => node !== null),
      [nodes, toFlowNode],
    );

    const draftSummaries = useMemo<DraftSummary[]>(
      () =>
        drafts.map((draft) => ({
          id: draft.id,
          name: draft.name,
          updatedAt: draft.updatedAt,
        })),
      [drafts],
    );

    const handleMoveEnd = useCallback(
      (_evt: MouseEvent | TouchEvent, viewport: Viewport) => {
        if (typeof viewport?.zoom !== "number") return;
        setZoomLevel((prev) => (prev === viewport.zoom ? prev : viewport.zoom));
      },
      [],
    );

    const handleInit = useCallback(
      (instance: ReactFlowInstance<FlowNode, FlowEdge>) => {
        rfRef.current = instance;
      },
      [],
    );

    const miniMapNodeColor = useCallback<GetMiniMapNodeAttribute>(
      (node) => {
        const type = (node?.type ?? "") as FlowNodeType;
        switch (type) {
          case "trigger":
            return "#22c55e";
          case "message":
            return "#3b82f6";
          case "options":
          return "#f59e0b";
        case "delay":
          return "#fb923c";
        case "condition":
          return "#a855f7";
        case "api":
          return "#06b6d4";
        case "assign":
          return "#f472b6";
        case "media":
          return "#14b8a6";
        case "handoff":
          return "#d946ef";
          case "goto":
            return "#64748b";
          case "end":
          default:
            return "#94a3b8";
        }
      },
      [],
    );

    const miniMapNodeStroke = useCallback<GetMiniMapNodeAttribute>(
      (node) => (node?.selected ? "#0ea5e9" : "#475569"),
      [],
    );

    return (
      <>
        <div className="flex h-screen w-full flex-col bg-slate-50 text-slate-900">
          <div className="border-b bg-white/90 shadow-sm">
            <Topbar
              onNew={handleCreateNew}
              onImport={handleImport}
              onExport={handleExport}
              onValidate={validate}
              onAutoLayout={doAutoLayout}
              onUndo={undo}
              onRedo={redo}
              zoomIn={zoomIn}
              zoomOut={zoomOut}
              fitView={fitView}
              selectedId={selected?.id}
              zoomLevel={zoomLevel}
              exportName="whatsapp-flow"
              onSaveDraft={handleQuickSave}
              savingDraft={savingDraft}
              onOpenDrafts={() => setDraftDialogOpen(true)}
              dirty={dirty}
              currentDraftName={currentDraftName}
              lastSavedAt={lastSavedAt}
            />
          </div>

          <div className="grid flex-1 grid-cols-12 gap-0 overflow-hidden">
            {/* Left: Palette */}
            <div className="col-span-2 min-h-0 overflow-y-auto border-r bg-white/80 p-4 backdrop-blur-sm shadow-inner">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Nodos
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={handleExport}>
                      <Download className="mr-2 h-4 w-4" />
                      Editor JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportForWhatsApp}>
                      <Rocket className="mr-2 h-4 w-4" />
                      WhatsApp Spec
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Palette onAdd={addNode} />
              <Separator className="my-4" />
              <div className="rounded-md bg-slate-100/80 p-3 text-xs text-muted-foreground shadow-sm">
                Consejo: clickeá o arrastrá nodos al lienzo.
              </div>
            </div>

            {/* Center: Canvas */}
            <div className="col-span-7 min-h-0 bg-slate-100/60">
              <ReactFlow
                style={{ width: "100%", height: "100%" }}
                className="!bg-transparent"
                onInit={handleInit}
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={memoizedNodeTypes}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onSelectionChange={handleSelectionChange}
                onMoveEnd={handleMoveEnd}
                defaultEdgeOptions={{
                  type: "smoothstep",
                  markerEnd: { type: MarkerType.ArrowClosed },
                }}
                snapToGrid
                snapGrid={[8, 8]}
                selectionOnDrag
                panOnDrag={[1, 2]}
                panOnScroll
                zoomOnScroll
                zoomOnPinch
                panOnScrollSpeed={0.8}
                elevateNodesOnSelect
                selectionMode={SelectionMode.Partial}
                deleteKeyCode={null}
              >
                <Background
                  color="#e2e8f0"
                  variant={BackgroundVariant.Lines}
                  gap={24}
                />
                <MiniMap
                  className="!bg-white/80"
                  pannable
                  zoomable
                  nodeColor={miniMapNodeColor}
                  nodeStrokeColor={miniMapNodeStroke}
                  nodeStrokeWidth={2}
                />
                <Controls position="bottom-left" showInteractive={false} />
              </ReactFlow>
            </div>

            {/* Right: Inspector + Simulator */}
            <div className="col-span-3 min-h-0 overflow-y-auto border-l bg-white/80 p-4 backdrop-blur-sm">
              <div className="flex flex-col gap-4">
                <Inspector selectedNode={selected} onChange={updateSelected} />
                <Simulator nodes={simulatorNodes} edges={edges} />
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Bug className="h-4 w-4" /> Consejos de construcción
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-xs text-muted-foreground">
                    <div>
                      • Mantené los mensajes por debajo de los {waTextLimit}{" "}
                      caracteres.
                    </div>
                    <div>• Usá Opciones (quick replies) para hacer menús.</div>
                    <div>• Usá Delay para evitar atosigar a los usuarios.</div>
                    <div>
                      • Condition puede ramificar según <code>context</code> y
                      resultados de API.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        <DraftsDialog
          open={draftDialogOpen}
          onOpenChange={setDraftDialogOpen}
          drafts={draftSummaries}
          onSave={async (payload) => {
            const ok = await handleSaveDraft(payload);
            if (ok) {
              setDraftDialogOpen(false);
            }
          }}
          onLoad={handleLoadDraft}
          onDelete={handleDeleteDraft}
          saving={savingDraft}
          dirty={dirty}
          currentDraftId={currentDraftId}
          currentDraftName={currentDraftName}
          lastSavedAt={lastSavedAt}
        />
      </>
    );
  },
);

FlowBuilder.displayName = "FlowBuilder";
export default FlowBuilder;
