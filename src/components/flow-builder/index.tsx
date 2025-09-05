"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
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
  type Node,
  type Edge,
  type OnConnect,
  type Connection,
  type NodeTypes,
  type NodeProps,
  type ReactFlowInstance,
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
  TriggerDataSchema,
  MessageDataSchema,
  OptionsDataSchema,
  DelayDataSchema,
  ConditionDataSchema,
  APICallDataSchema,
  AssignVarDataSchema,
  MediaDataSchema,
  HandoffDataSchema,
  GotoDataSchema,
  EndDataSchema,
  waTextLimit,
} from "./types";
import { getLayoutedElements, makeId, getStarterData } from "./helpers";
import { nodeTypes as rawNodeTypes } from "./nodes";
import { Inspector } from "./Inspector";
import { Simulator } from "./Simulator";
import { Topbar } from "./Toolbar";
import { Palette } from "./Palette";

/** ---------------------------
 *    Tipos y utilidades
 *  --------------------------- */
type WhatsAppNodeType =
  | "trigger"
  | "message"
  | "options"
  | "delay"
  | "condition"
  | "api"
  | "assign"
  | "media"
  | "handoff"
  | "goto"
  | "end";

type WNode = Node<Record<string, unknown>, WhatsAppNodeType>;
type WEdge = Edge;

type FlowSnapshot = { nodes: WNode[]; edges: WEdge[] };

const nodeTypes: NodeTypes = rawNodeTypes as NodeTypes;

const GRID_SIZE = 24;
const HISTORY_LIMIT = 100;

function clampHistory<T>(arr: T[], limit = HISTORY_LIMIT) {
  if (arr.length > limit) arr.splice(0, arr.length - limit);
  return arr;
}

/** ---------------------------
 *    Estado inicial (igual)
 *  --------------------------- */
const defaultNodes: WNode[] = [
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

const defaultEdges: WEdge[] = [
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

/** ---------------------------
 *   Componente principal
 *  --------------------------- */
type FlowBuilderProps = {
  initialFlow?: Partial<FlowSnapshot> & { id?: string };
};

export type FlowBuilderRef = {
  /** Obtiene el flujo actual (nodos + aristas) */
  getFlowData: () => FlowSnapshot;
  /** Reemplaza el flujo por completo */
  setFlowData: (data: FlowSnapshot) => void;
  /** Valida y retorna lista de problemas (no lanza toast) */
  validateSilently: () => string[];
  /** Centra la vista en un nodo por id */
  centerOnNode: (nodeId: string) => void;
  /** Exporta como JSON (descarga) */
  exportJSON: () => void;
  /** Ejecuta auto-layout (TB) */
  autoLayoutTB: () => void;
  /** Ejecuta auto-layout (LR) */
  autoLayoutLR: () => void;
};

const FlowBuilder = forwardRef<FlowBuilderRef, FlowBuilderProps>(
  ({ initialFlow }, ref) => {
    // ---------------- Refs y estados principales ----------------
    const [nodes, setNodes, onNodesChange] =
      useNodesState<Record<string, unknown>>(defaultNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
    const [selected, setSelected] = useState<WNode | null>(null);

    const autosaveKey = useMemo(
      () => `flow:${initialFlow?.id ?? "current"}`,
      [initialFlow?.id],
    );

    const rfInstanceRef = useRef<ReactFlowInstance | null>(null);
    const clipboardRef = useRef<WNode | null>(null);
    const isDirtyRef = useRef(false);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ---------------- Carga inicial ----------------
    useEffect(() => {
      // Si viene un flujo por props, úsalo; si no, intenta cargar autosave
      if (initialFlow?.nodes && initialFlow?.edges) {
        setNodes(initialFlow.nodes as WNode[]);
        setEdges(initialFlow.edges as WEdge[]);
        return;
      }
      try {
        const raw = localStorage.getItem(autosaveKey);
        if (raw) {
          const parsed = JSON.parse(raw) as FlowSnapshot;
          if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
            setNodes(parsed.nodes);
            setEdges(parsed.edges);
            toast.message("Flujo cargado desde autoguardado");
          }
        }
      } catch {
        // no-op
      }
    }, [initialFlow, autosaveKey, setNodes, setEdges]);

    // ---------------- Historial (undo/redo) ----------------
    const historyRef = useRef<{ past: string[]; future: string[] }>({
      past: [JSON.stringify({ nodes: defaultNodes, edges: defaultEdges })],
      future: [],
    });

    useEffect(() => {
      const snapshot = JSON.stringify({ nodes, edges });
      historyRef.current.past.push(snapshot);
      clampHistory(historyRef.current.past);
      historyRef.current.future = [];
      isDirtyRef.current = true;
      // autosave (debounced)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(
            autosaveKey,
            JSON.stringify({ nodes, edges }, null, 2),
          );
        } catch {
          // no-op
        }
      }, 600);
    }, [nodes, edges, autosaveKey]);

    const undo = useCallback(() => {
      const past = historyRef.current.past;
      if (past.length <= 1) return;
      const current = past.pop();
      if (current) historyRef.current.future.push(current);
      const prev = JSON.parse(past[past.length - 1]) as FlowSnapshot;
      setNodes(prev.nodes);
      setEdges(prev.edges);
    }, [setNodes, setEdges]);

    const redo = useCallback(() => {
      const next = historyRef.current.future.pop();
      if (!next) return;
      historyRef.current.past.push(next);
      clampHistory(historyRef.current.past);
      const state = JSON.parse(next) as FlowSnapshot;
      setNodes(state.nodes);
      setEdges(state.edges);
    }, [setNodes, setEdges]);

    // ---------------- Seguridad al salir ----------------
    useEffect(() => {
      const handler = (e: BeforeUnloadEvent) => {
        if (isDirtyRef.current) {
          e.preventDefault();
          e.returnValue =
            "Hay cambios sin guardar/exportar. ¿Seguro que querés salir?";
        }
      };
      window.addEventListener("beforeunload", handler);
      return () => window.removeEventListener("beforeunload", handler);
    }, []);

    // ---------------- Acciones sobre nodos ----------------
    const addNode = (type: WhatsAppNodeType) => {
      const id = makeId();
      const y = (nodes.at(-1)?.position?.y || 0) + 140;
      const x = nodes.at(-1)?.position?.x || 0;
      const data = { name: `${type}-${id}`, ...getStarterData(type) };
      setNodes((nds) => nds.concat({ id, type, data, position: { x, y } }));
    };

    const onConnect: OnConnect = useCallback(
      (params) =>
        setEdges((eds) =>
          addEdge(
            {
              ...params,
              type: "smoothstep",
              markerEnd: { type: MarkerType.ArrowClosed },
            },
            eds,
          ),
        ),
      [setEdges],
    );

    const onEdgeUpdate = useCallback(
      (oldEdge: Edge, newConnection: Connection) => {
        setEdges((eds) =>
          eds.map((e) =>
            e.id === oldEdge.id ? { ...e, ...newConnection } : e,
          ),
        );
      },
      [setEdges],
    );

    const onNodeClick = useCallback((_: unknown, node: WNode) => {
      setSelected(node);
    }, []);
    const onPaneClick = useCallback(() => setSelected(null), []);

    const handleEdit = useCallback(
      (node: WNode) => {
        setSelected(node);
      },
      [setSelected],
    );

    const handleDuplicate = useCallback(
      (node: WNode) => {
        const newNode: WNode = {
          ...node,
          id: makeId(),
          selected: false,
          position: {
            x: node.position.x + 20,
            y: node.position.y + 20,
          },
        };
        setNodes((nds) => nds.concat(newNode));
      },
      [setNodes],
    );

    const handleDelete = useCallback(
      (nodeId: string) => {
        setNodes((nds) => nds.filter((n) => n.id !== nodeId));
        setEdges((eds) =>
          eds.filter((ed) => ed.source !== nodeId && ed.target !== nodeId),
        );
        setSelected((s) => (s?.id === nodeId ? null : s));
      },
      [setNodes, setEdges],
    );

    const handleCopyWebhook = useCallback((node: WNode) => {
      const webhookUrl = `${window.location.origin}/api/webhook?flowId=${node.id}`;
      navigator.clipboard.writeText(webhookUrl);
      toast.success("URL del webhook copiada al portapapeles!");
    }, []);

    const handleCopyId = useCallback((nodeId: string) => {
      navigator.clipboard.writeText(nodeId);
      toast.success("ID copiado al portapapeles!");
    }, []);

    // Copiar / Pegar (nodo seleccionado)
    const copySelected = useCallback(() => {
      if (!selected) return;
      clipboardRef.current = selected;
      toast.message(`Nodo copiado: ${selected.id}`);
    }, [selected]);

    const pasteCopied = useCallback(() => {
      const src = clipboardRef.current;
      if (!src) return;
      const clone: WNode = {
        ...src,
        id: makeId(),
        position: { x: src.position.x + 40, y: src.position.y + 40 },
        selected: true,
      };
      setNodes((nds) => nds.concat(clone));
      setSelected(clone);
      toast.success("Nodo pegado");
    }, [setNodes]);

    // Actualizar datos del seleccionado
    const updateSelected = (patch: Partial<WNode>) => {
      if (!selected) return;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === selected.id
            ? { ...n, ...patch, data: { ...n.data, ...(patch.data || {}) } }
            : n,
        ),
      );
      setSelected((s) =>
        s
          ? {
              ...s,
              ...patch,
              data: { ...s.data, ...(patch.data || {}) },
            }
          : s,
      );

      // Al cambiar "options", limpiar aristas colgantes
      if (
        selected.type === "options" &&
        patch.data &&
        Object.prototype.hasOwnProperty.call(patch.data, "options")
      ) {
        const opts =
          (patch.data as Partial<{ options: string[] }>).options || [];
        const handles = new Set(
          opts.map((_: unknown, i: number) => `opt-${i}`),
        );
        setEdges((eds) =>
          eds.filter(
            (e) =>
              !(
                e.source === selected.id &&
                e.sourceHandle &&
                !handles.has(e.sourceHandle)
              ),
          ),
        );
      }
    };

    // DnD desde Paleta
    const rfViewportRef = useRef<HTMLDivElement | null>(null);
    const onDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        const type = e.dataTransfer.getData("application/wa-node") as
          | WhatsAppNodeType
          | "";
        if (!type) return;
        // Obtener posición precisa del cursor dentro del viewport del flow
        const bounds = rfViewportRef.current?.getBoundingClientRect();
        const px = e.clientX - (bounds?.left ?? 0);
        const py = e.clientY - (bounds?.top ?? 0);
        const pos = rfInstanceRef.current?.project({ x: px, y: py }) ?? {
          x: 0,
          y: 0,
        };

        const id = makeId();
        const data = { name: `${type}-${id}`, ...getStarterData(type) };
        setNodes((nds) =>
          nds.concat({ id, type, position: pos, data } as WNode),
        );
      },
      [setNodes],
    );

    const onDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }, []);

    // ---------------- Import / Export (sin cambios y extra) ----------------
    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const json = JSON.parse(String(reader.result));
          if (!Array.isArray(json.nodes) || !Array.isArray(json.edges))
            throw new Error("Invalid file");
          setNodes(json.nodes as WNode[]);
          setEdges(json.edges as WEdge[]);
          toast.success("Flujo importado");
        } catch {
          toast.error("Error al importar");
        }
      };
      reader.readAsText(file);
    };

    const handleExport = useCallback(() => {
      const payload = JSON.stringify({ nodes, edges }, null, 2);
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `whatsapp-flow-${new Date().toISOString().slice(0, 19)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      isDirtyRef.current = false;
    }, [nodes, edges]);

    const exportForWhatsApp = () => {
      const spec = {
        version: 1,
        nodes,
        edges,
        notes:
          "Exportado para WA; mapear 'message' a /messages; 'media' a media messages; 'options' a quick replies; etc.",
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

    // ---------------- Validación (mejorada) ----------------
    const validateSilently = useCallback((): string[] => {
      const problems: string[] = [];

      // 1) triggers duplicados y vacíos
      const triggers = nodes.filter((n) => n.type === "trigger");
      const triggerKeys = triggers.map((t) =>
        t.data?.keyword?.trim()?.toLowerCase(),
      );
      const triggerSet = new Set(triggerKeys.filter(Boolean));
      if (triggerSet.size !== triggerKeys.filter(Boolean).length) {
        problems.push("Palabras clave de disparador duplicadas.");
      }
      if (triggers.length === 0) {
        problems.push("No hay nodos 'trigger'. Agregá al menos uno.");
      }

      // 2) zod por tipo + aristas requeridas / accesibilidad
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
              GotoDataSchema.parse(n.data);
              break;
            case "end":
              EndDataSchema.parse(n.data);
              break;
          }
        } catch (e) {
          problems.push(`${n.id} (${n.type}): ${String(e)}`);
        }

        if (n.type !== "end" && !edges.some((e) => e.source === n.id)) {
          if (n.type !== "options" && n.type !== "condition") {
            problems.push(`${n.id}: sin conexión de salida.`);
          }
        }
        if (n.type !== "trigger" && !edges.some((e) => e.target === n.id)) {
          problems.push(`${n.id}: inaccesible (sin conexión entrante).`);
        }
      });

      // 3) límite de texto WA
      const longMsgs = nodes
        .filter((n) => n.type === "message")
        .filter((n) => (n.data?.text?.length ?? 0) > waTextLimit)
        .map(
          (n) =>
            `${n.id}(${n.data?.name ?? "message"}): ${n.data?.text?.length} caracteres`,
        );
      if (longMsgs.length) {
        problems.push(
          `Mensajes por encima de ${waTextLimit} caracteres: ${longMsgs.join(
            " | ",
          )}`,
        );
      }

      // 4) handlers de 'options' vs aristas
      const optNodes = nodes.filter((n) => n.type === "options");
      optNodes.forEach((n) => {
        const opts: unknown[] = n.data?.options ?? [];
        const needed = new Set(opts.map((_, i) => `opt-${i}`));
        const have = new Set(
          edges
            .filter((e) => e.source === n.id && e.sourceHandle)
            .map((e) => e.sourceHandle!),
        );
        // si hay más handles salientes que opciones (o al revés), avisar
        for (const h of have) {
          if (!needed.has(h)) {
            problems.push(
              `${n.id}: tiene una conexión desde handle inexistente "${h}".`,
            );
          }
        }
      });

      return problems;
    }, [nodes, edges]);

    const validate = useCallback(() => {
      const problems = validateSilently();
      if (problems.length) {
        problems.forEach((p) => toast.error(p));
      } else {
        toast.success("¡Todo bien! El flujo parece válido.");
      }
      return problems;
    }, [validateSilently]);

    // ---------------- Auto Layout ----------------
    const doAutoLayout = useCallback(
      (direction: "TB" | "LR" = "TB") => {
        const layout = getLayoutedElements(nodes, edges, direction);
        setNodes(layout.nodes);
      },
      [nodes, edges, setNodes],
    );

    // ---------------- Atajos de teclado (ampliados) ----------------
    const nudge = useCallback(
      (dx: number, dy: number) => {
        if (!selected) return;
        setNodes((nds) =>
          nds.map((n) =>
            n.id === selected.id
              ? {
                  ...n,
                  position: { x: n.position.x + dx, y: n.position.y + dy },
                }
              : n,
          ),
        );
      },
      [selected, setNodes],
    );

    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        // Guardar JSON
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          handleExport();
        }
        // Undo / Redo
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        }
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
          e.preventDefault();
          redo();
        }
        // Borrar seleccionado
        if (e.key === "Delete" || e.key === "Backspace") {
          if (selected) {
            handleDelete(selected.id);
          }
        }
        // Copiar / Pegar
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c") {
          e.preventDefault();
          copySelected();
        }
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v") {
          e.preventDefault();
          pasteCopied();
        }
        // Nudges con flechas
        const step = e.shiftKey ? 20 : 5;
        if (e.key === "ArrowUp") nudge(0, -step);
        if (e.key === "ArrowDown") nudge(0, step);
        if (e.key === "ArrowLeft") nudge(-step, 0);
        if (e.key === "ArrowRight") nudge(step, 0);

        // Crear nodos rápidos
        if ((e.metaKey || e.ctrlKey) && e.altKey) {
          const map: Record<string, WhatsAppNodeType> = {
            "1": "message",
            "2": "options",
            "3": "delay",
            "4": "condition",
            "5": "api",
            "6": "assign",
            "7": "media",
            "8": "handoff",
            "9": "goto",
            "0": "end",
          };
          if (map[e.key]) {
            e.preventDefault();
            addNode(map[e.key]);
          }
        }

        // Validar
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
          e.preventDefault();
          validate();
        }

        // Centrar seleccionado
        if (e.key.toLowerCase() === "f" && selected) {
          e.preventDefault();
          const pos = selected.position;
          rfInstanceRef.current?.setCenter(pos.x + 100, pos.y + 50, {
            zoom: 1.2,
            duration: 400,
          });
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [
      selected,
      handleExport,
      undo,
      redo,
      handleDelete,
      copySelected,
      pasteCopied,
      nudge,
      validate,
    ]);

    // ---------------- Zoom helpers ----------------
    const zoomIn = () => rfInstanceRef.current?.zoomIn?.();
    const zoomOut = () => rfInstanceRef.current?.zoomOut?.();
    const fitView = () => rfInstanceRef.current?.fitView?.();

    // ---------------- API pública via ref ----------------
    React.useImperativeHandle(
      ref,
      (): FlowBuilderRef => ({
        getFlowData: () => ({ nodes, edges }),
        setFlowData: (data) => {
          setNodes(data.nodes);
          setEdges(data.edges);
        },
        validateSilently,
        centerOnNode: (nodeId: string) => {
          const n = nodes.find((x) => x.id === nodeId);
          if (!n) return;
          setSelected(n);
          rfInstanceRef.current?.setCenter(
            n.position.x + 100,
            n.position.y + 50,
            {
              zoom: 1.2,
              duration: 400,
            },
          );
        },
        exportJSON: handleExport,
        autoLayoutTB: () => doAutoLayout("TB"),
        autoLayoutLR: () => doAutoLayout("LR"),
      }),
    );

    // ---------------- Estadísticas en vivo (panel derecho) ----------------
    const stats = useMemo(() => {
      const byType = nodes.reduce<Record<string, number>>((acc, n) => {
        acc[n.type] = (acc[n.type] ?? 0) + 1;
        return acc;
      }, {});
      const msgLens = nodes
        .filter((n) => n.type === "message")
        .map((n) => n.data?.text?.length ?? 0);
      const maxMsg = msgLens.length ? Math.max(...msgLens) : 0;
      const totalMsgChars = msgLens.reduce((a, b) => a + b, 0);
      return {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        byType,
        maxMsg,
        totalMsgChars,
      };
    }, [nodes, edges]);

    // ---------------- Render ----------------
    const memoizedNodeTypes = useMemo(() => {
      const custom: NodeTypes = {};
      for (const [key, NodeType] of Object.entries(nodeTypes)) {
        (custom as Record<string, (p: NodeProps<Record<string, unknown>>) => JSX.Element>)[
          key
        ] = (props: NodeProps<Record<string, unknown>>) => (
          <NodeType
            {...props}
            onEdit={() => handleEdit(props as unknown as WNode)}
            onDuplicate={() => handleDuplicate(props as unknown as WNode)}
            onDelete={() => handleDelete(props.id)}
            onCopyWebhook={() => handleCopyWebhook(props as unknown as WNode)}
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

    return (
      <div className="h-screen w-full grid grid-cols-12 gap-0">
        <div className="col-span-12">
          <Topbar
            onNew={() => {
              setNodes(defaultNodes);
              setEdges(defaultEdges);
              setSelected(null);
              toast.message("Nuevo flujo creado");
            }}
            onImport={handleImport}
            onExport={handleExport}
            onValidate={validate}
            onAutoLayout={() => doAutoLayout("TB")}
            onUndo={undo}
            onRedo={redo}
            zoomIn={zoomIn}
            zoomOut={zoomOut}
            fitView={fitView}
            selectedId={selected?.id}
          />
        </div>

        {/* Izquierda: Paleta */}
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
          <Palette onAdd={(type: WhatsAppNodeType) => addNode(type)} />
          <Separator className="my-4" />
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Consejo: click o arrastrá nodos al lienzo.</div>
            <div>
              Atajos: ⌘/Ctrl+Alt+[1..0] crea nodo, ⌘/Ctrl+B valida, F centra,
              ↑↓←→ mueve.
            </div>
          </div>
        </div>

        {/* Centro: Lienzo */}
        <div className="col-span-7 h-[calc(100vh-48px)]" ref={rfViewportRef}>
          <ReactFlow
            onInit={(inst) => (rfInstanceRef.current = inst)}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgeUpdate={onEdgeUpdate}
            nodeTypes={memoizedNodeTypes}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            defaultEdgeOptions={{
              type: "smoothstep",
              markerEnd: { type: MarkerType.ArrowClosed },
            }}
            fitView
            snapToGrid
            snapGrid={[GRID_SIZE, GRID_SIZE]}
            selectionOnDrag
            panOnScroll
            zoomOnDoubleClick
            elevateEdgesOnSelect
            proOptions={{ hideAttribution: true }}
          >
            <Background variant="dots" gap={16} size={1} />
            <MiniMap zoomable pannable />
            <Controls />
          </ReactFlow>
        </div>

        {/* Derecha: Inspector + Simulador + Estadísticas */}
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
              <div>• Usá Opciones (quick replies) para menús guiados.</div>
              <div>• Usá Delay para evitar atosigar a los usuarios.</div>
              <div>
                • Condition puede ramificar en base al <code>contexto</code> y
                resultados de la API.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estado del flujo</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <div>Total de nodos: {stats.totalNodes}</div>
              <div>Total de conexiones: {stats.totalEdges}</div>
              <div>
                Por tipo:{" "}
                {Object.entries(stats.byType)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" · ")}
              </div>
              <div>Mensaje más largo: {stats.maxMsg} caracteres</div>
              <div>Chars totales en mensajes: {stats.totalMsgChars}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  },
);

FlowBuilder.displayName = "FlowBuilder";
export default FlowBuilder;
