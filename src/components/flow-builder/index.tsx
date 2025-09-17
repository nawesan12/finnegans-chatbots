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
  Connection,
  Edge,
  Node,
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
} from "./types";
import { getLayoutedElements, makeId, getStarterData } from "./helpers";
import { nodeTypes } from "./nodes";
import { Inspector } from "./Inspector";
import { Simulator } from "./Simulator";
import { Topbar } from "./Toolbar";
import { Palette } from "./Palette";
import { z } from "zod";

// Exportá estos tipos
export type RFNode = Node;
export type RFEdge = Edge;

export type FlowData = { nodes: RFNode[]; edges: RFEdge[] };
export type FlowBuilderHandle = { getFlowData: () => FlowData };

type FlowBuilderProps = {
  initialFlow?: Partial<FlowData> | null;
};
const defaultNodes: Node[] = [
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

const defaultEdges: Edge[] = [
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

const FlowFileSchema = z.object({
  nodes: z
    .array(
      z
        .object({
          id: z.string(),
          type: z.string(),
          position: z
            .object({
              x: z.number().optional(),
              y: z.number().optional(),
            })
            .optional(),
          data: z.unknown().optional(),
        })
        .passthrough(),
    )
    .default([]),
  edges: z
    .array(
      z
        .object({
          id: z.string(),
          source: z.string(),
          target: z.string(),
          sourceHandle: z.string().nullable().optional(),
          targetHandle: z.string().nullable().optional(),
        })
        .passthrough(),
    )
    .default([]),
});

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

const FlowBuilder = React.forwardRef<FlowBuilderHandle, FlowBuilderProps>(
  ({ initialFlow }, ref) => {
    const [nodes, setNodes, onNodesChange] =
      useNodesState<Node[]>(defaultNodes);
    const [edges, setEdges, onEdgesChange] =
      useEdgesState<Edge[]>(defaultEdges);
    const [selected, setSelected] = useState<Node | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [zoomLevel, setZoomLevel] = useState<number | undefined>(undefined);
    const rfRef = useRef<any>(null);
    const historyRef = useRef<{ past: string[]; future: string[] }>({
      past: [],
      future: [],
    });
    const didRestoreRef = useRef(false);

    const cloneNode = useCallback(
      (node: Node): Node => ({
        ...node,
        data: deepClone(node.data) as Node["data"],
        position: {
          x: typeof node.position?.x === "number" ? node.position.x : 0,
          y: typeof node.position?.y === "number" ? node.position.y : 0,
        },
      }),
      [],
    );

    const applyFlow = useCallback(
      (flow: FlowData) => {
        const nextNodes = flow.nodes.map((node) => cloneNode(node));
        const nextEdges = flow.edges.map((edge) => ({ ...edge }));

        historyRef.current.past = [];
        historyRef.current.future = [];

        setNodes(nextNodes);
        setEdges(nextEdges);
        setSelected(null);
        setSelectedIds([]);

        requestAnimationFrame(() =>
          rfRef.current?.fitView?.({ padding: 0.2 }),
        );
      },
      [cloneNode, setEdges, setNodes, setSelected, setSelectedIds],
    );

    // Load initial flow or draft once
    useEffect(() => {
      if (initialFlow?.nodes && initialFlow?.edges) {
        applyFlow({ nodes: initialFlow.nodes, edges: initialFlow.edges });
        didRestoreRef.current = true;
        return;
      }

      if (didRestoreRef.current) return;

      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const parsed = FlowFileSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) return;
        applyFlow({
          nodes: parsed.data.nodes as unknown as Node[],
          edges: parsed.data.edges as unknown as Edge[],
        });
      } catch {
        // ignore drafts with errores
      } finally {
        didRestoreRef.current = true;
      }
    }, [applyFlow, initialFlow]);

    // Expose ref API
    //eslint-disable-next-line
    useImperativeHandle(ref, () => ({
      getFlowData: () => ({ nodes, edges }),
    }));

    // Autosave draft
    useEffect(() => {
      const payload = JSON.stringify({ nodes, edges });
      try {
        localStorage.setItem(DRAFT_KEY, payload);
      } catch {
        // ignore
      }
    }, [nodes, edges]);

    // add node
    const addNode = useCallback(
      (type: string) => {
        const id = makeId();
        const last = nodes.at(-1);
        const position = {
          x: last?.position?.x ?? 0,
          y: (last?.position?.y ?? 0) + 140,
        };
        const data = { name: `${type}-${id}`, ...getStarterData(type) };
        const newNode: Node = { id, type, data, position };

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

    const onNodeClick = (_: any, node: Node) => setSelected(node);
    const onPaneClick = () => setSelected(null);

    const handleEdit = useCallback((node: Node) => setSelected(node), []);
    const handleDuplicate = useCallback(
      (node: Node) => {
        const id = makeId();
        const base = cloneNode(node);
        const duplicate: Node = {
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
      [cloneNode, setNodes, setSelected, setSelectedIds],
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
      (node: Node) => {
        const webhookUrl = `${window.location.origin}/api/webhook?flowId=${node.id}`;
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

    const updateSelected = useCallback(
      (patch: Partial<Node>) => {
        setSelected((s) => {
          if (!s) return s;

          const newSelected = {
            ...s,
            ...patch,
            data: { ...s.data, ...(patch as any).data },
          } as Node;

          setNodes((nds) => nds.map((n) => (n.id === s.id ? newSelected : n)));

          if (
            s.type === "options" &&
            (patch as any).data &&
            Object.prototype.hasOwnProperty.call((patch as any).data, "options")
          ) {
            const opts = ((patch as any).data?.options || []) as unknown[];
            const handles = new Set(opts.map((_, i: number) => `opt-${i}`));
            handles.add("no-match");
            setEdges((eds) =>
              eds.filter(
                (e) =>
                  !(
                    e.source === s.id &&
                    e.sourceHandle &&
                    !handles.has(e.sourceHandle)
                  ),
              ),
            );
          }

          return newSelected;
        });
      },
      [setNodes, setEdges],
    );

    const onDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        const type = e.dataTransfer.getData("application/wa-node");
        if (!type) return;
        const bounds = (rfRef.current as any)?.getBoundingClientRect?.() || {
          left: 0,
          top: 0,
        };
        const position =
          rfRef.current?.project?.({
            x: e.clientX - bounds.left,
            y: e.clientY - bounds.top,
          }) || ({ x: 0, y: 0 } as const);
        const id = makeId();
        const data = { name: `${type}-${id}`, ...getStarterData(type) };
        const newNode: Node = {
          id,
          type,
          position: {
            x: position.x,
            y: position.y,
          },
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
      async (
        event:
          | React.ChangeEvent<HTMLInputElement>
          | { target?: { files?: FileList | File[] | null; value?: string } },
      ) => {
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
          const parsed = FlowFileSchema.parse(JSON.parse(text));
          applyFlow({
            nodes: parsed.nodes as unknown as Node[],
            edges: parsed.edges as unknown as Edge[],
          });
          toast.success(
            `Flujo importado${file.name ? ` (${file.name})` : ""}`,
          );
        } catch {
          toast.error("Error al importar: archivo inválido");
        } finally {
          const target = event?.target as HTMLInputElement | undefined;
          if (target && "value" in target) {
            target.value = "";
          }
        }
      },
      [applyFlow],
    );

    const handleExport = useCallback(() => {
      const payload = JSON.stringify({ nodes, edges }, null, 2);
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
      const problems: string[] = [];
      const triggers = nodes.filter((n) => n.type === "trigger");
      const triggerKeys = triggers
        .map((t) => t.data?.keyword?.toLowerCase()?.trim())
        .filter(Boolean);
      const triggerSet = new Set(triggerKeys);
      if (triggerSet.size !== triggerKeys.length)
        problems.push("Palabras clave de disparador duplicadas");
      if (!triggers.length)
        problems.push("El flujo necesita al menos un nodo trigger");

      nodes.forEach((n) => {
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
          problems.push(`${n.id} (${n.type}): ${String(e)}`);
        }
        const outgoingFromNode = edges.filter((e) => e.source === n.id);
        if (n.type !== "end" && outgoingFromNode.length === 0) {
          if (n.type !== "options" && n.type !== "condition") {
            problems.push(`${n.id}: sin conexión de salida`);
          }
        }
        if (n.type !== "trigger" && !edges.some((e) => e.target === n.id)) {
          problems.push(`${n.id}: inaccesible (sin conexión entrante)`);
        }

        if (n.type === "options") {
          const opts = Array.isArray(n.data?.options) ? n.data.options : [];
          const missing: string[] = [];
          opts.forEach((_, idx) => {
            if (!outgoingFromNode.some((e) => e.sourceHandle === `opt-${idx}`)) {
              missing.push(`#${idx + 1}`);
            }
          });
          if (!outgoingFromNode.some((e) => e.sourceHandle === "no-match")) {
            missing.push("No Match");
          }
          if (missing.length) {
            problems.push(
              `${n.id}: opciones sin salida (${missing.join(", ")})`,
            );
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
            problems.push(`${n.id}: condición sin rama ${missing}`);
          }
        }

        if (n.type === "goto") {
          const targetId = (n.data as any)?.targetNodeId;
          if (targetId && !nodes.some((candidate) => candidate.id === targetId)) {
            problems.push(`${n.id}: destino ${targetId} inexistente`);
          }
        }
      });

      if (problems.length) problems.forEach((p) => toast.error(p));
      else toast.success("Todo bien! El flujo parece válido.");
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
      const snapshot = JSON.stringify({ nodes, edges });
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
      const prev = JSON.parse(past[past.length - 1]);
      setNodes(prev.nodes);
      setEdges(prev.edges);
      setSelected(null);
      setSelectedIds([]);
    }, [setEdges, setNodes, setSelected, setSelectedIds]);

    const redo = useCallback(() => {
      const next = historyRef.current.future.pop();
      if (!next) return;
      historyRef.current.past.push(next);
      const state = JSON.parse(next);
      setNodes(state.nodes);
      setEdges(state.edges);
      setSelected(null);
      setSelectedIds([]);
    }, [setEdges, setNodes, setSelected, setSelectedIds]);

    // keyboard shortcuts
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        const typing =
          tag === "input" ||
          tag === "textarea" ||
          (e.target as any)?.isContentEditable;

        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          handleExport();
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
    }, [selected, selectedIds, setNodes, setEdges, handleExport, undo, redo]);

    // zoom controls
    const zoomIn = () => rfRef.current?.zoomIn?.();
    const zoomOut = () => rfRef.current?.zoomOut?.();
    const fitView = () => rfRef.current?.fitView?.();

    // track zoom level to show in Topbar
    const onMoveEnd = (_evt: any, viewport: { zoom: number }) => {
      if (typeof viewport?.zoom === "number") setZoomLevel(viewport.zoom);
    };

    // export to WA spec (outline)
    const exportForWhatsApp = () => {
      const spec = {
        version: 1,
        nodes,
        edges,
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

    const memoizedNodeTypes = useMemo(() => {
      const custom: Record<string, any> = {};
      for (const [key, NodeType] of Object.entries(nodeTypes)) {
        custom[key] = (props: any) => (
          <NodeType
            {...props}
            onEdit={() => handleEdit(props)}
            onDuplicate={() => handleDuplicate(props)}
            onDelete={() => handleDelete(props.id)}
            onCopyWebhook={() => handleCopyWebhook(props)}
            onCopyId={() => handleCopyId(props.id)}
          />
        );
      }
      return custom;
    }, [
      handleEdit,
      handleDuplicate,
      handleDelete,
      handleCopyWebhook,
      handleCopyId,
    ]);

    const lastSelIdsRef = useRef<string[]>([]);
    const shallowEqual = (a: string[], b: string[]) =>
      a.length === b.length && a.every((id, i) => id === b[i]);

    const handleSelectionChange = useCallback(
      (sel: { nodes?: Node[] } | null) => {
        const ids = (sel?.nodes || []).map((n) => n.id);
        if (shallowEqual(ids, lastSelIdsRef.current)) return; // 👈 evita setState redundante
        lastSelIdsRef.current = ids;
        setSelectedIds(ids);

        const first = (sel?.nodes || [])[0] ?? null;
        // Evita setSelected si no cambió realmente
        setSelected((prev) => (prev?.id === first?.id ? prev : first));
      },
      [],
    );

    const handleMoveEnd = useCallback(
      (_evt: any, viewport: { zoom: number }) => {
        if (typeof viewport?.zoom !== "number") return;
        setZoomLevel((prev) => (prev === viewport.zoom ? prev : viewport.zoom));
      },
      [],
    );

    const miniMapNodeColor = useCallback((node: Node) => {
      switch (node.type) {
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
    }, []);

    const miniMapNodeStroke = useCallback(
      (node: Node) => (node.selected ? "#0ea5e9" : "#475569"),
      [],
    );

    return (
      <div className="h-screen w-full grid grid-cols-12 gap-0">
        <div className="col-span-12">
          <Topbar
            onNew={() => {
              applyFlow({ nodes: defaultNodes, edges: defaultEdges });
              toast.message("Nuevo flujo creado");
            }}
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
          />
        </div>

        {/* Left: Palette */}
        <div className="col-span-2 h-[calc(100vh-48px)] border-r p-3 overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">Nodos</div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Editor JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportForWhatsApp}>
                  <Rocket className="h-4 w-4 mr-2" />
                  WhatsApp Spec
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Palette onAdd={addNode} />
          <Separator className="my-4" />
          <div className="text-xs text-muted-foreground">
            Consejo: clickeá o arrastrá nodos al lienzo.
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="col-span-7 h-[calc(100vh-48px)]">
          <ReactFlow
            ref={rfRef}
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
            onSelectionChange={handleSelectionChange} // veremos abajo
            onMoveEnd={handleMoveEnd} // veremos abajo
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
            selectionMode="partial"
            deleteKeyCode={null}
          >
            <Background color="#e2e8f0" variant="lines" gap={24} />
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
        <div className="col-span-3 h-[auto] border-l p-3 flex flex-col gap-3">
          <Inspector selectedNode={selected} onChange={updateSelected} />
          <Simulator nodes={nodes} edges={edges} />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-4 w-4" /> Consejos de construcción
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
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
    );
  },
);

FlowBuilder.displayName = "FlowBuilder";
export default FlowBuilder;
