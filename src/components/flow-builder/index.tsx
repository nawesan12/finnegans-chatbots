"use client";
import React, {
  useCallback,
  useEffect,
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

//eslint-disable-next-line
const FlowBuilder = React.forwardRef(
  (
    //@ts-expect-error bla
    { initialFlow },
    ref: React.ForwardedRef<HTMLDivElement>,
  ) => {
    const [nodes, setNodes, onNodesChange] =
      useNodesState<Node[]>(defaultNodes);
    const [edges, setEdges, onEdgesChange] =
      useEdgesState<Edge[]>(defaultEdges);
    const [selected, setSelected] = useState<Node | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [zoomLevel, setZoomLevel] = useState<number | undefined>(undefined);
    const rfRef = useRef<any>(null);

    // Load initial flow or draft
    useEffect(() => {
      if (initialFlow?.nodes && initialFlow?.edges) {
        setNodes(initialFlow.nodes);
        setEdges(initialFlow.edges);
        setTimeout(() => rfRef.current?.fitView?.({ padding: 0.2 }), 0);
        return;
      }
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
            setNodes(parsed.nodes);
            setEdges(parsed.edges);
            setTimeout(() => rfRef.current?.fitView?.({ padding: 0.2 }), 0);
          }
        }
      } catch {
        // ignore
      }
    }, [initialFlow, setNodes, setEdges]);

    // Expose ref API
    //eslint-disable-next-line
    React.useImperativeHandle(ref, () => ({
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
    const addNode = (type: string) => {
      const id = makeId();
      const y = (nodes.at(-1)?.position?.y || 0) + 140;
      const x = nodes.at(-1)?.position?.x || 0;
      const data = { name: `${type}-${id}`, ...getStarterData(type) };
      setNodes((nds) => nds.concat({ id, type, data, position: { x, y } }));
    };

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
        const newNode: Node = {
          ...node,
          id: makeId(),
          position: { x: node.position.x + 20, y: node.position.y + 20 },
          selected: false,
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
        setSelected(null);
      },
      [setNodes, setEdges],
    );

    const safeWriteClipboard = async (text: string, ok: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(ok);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
          toast.success(ok);
        } finally {
          document.body.removeChild(ta);
        }
      }
    };

    const handleCopyWebhook = useCallback((node: Node) => {
      const webhookUrl = `${window.location.origin}/api/webhook?flowId=${node.id}`;
      safeWriteClipboard(
        webhookUrl,
        "URL del webhook copiada al portapapeles!",
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCopyId = useCallback((nodeId: string) => {
      safeWriteClipboard(nodeId, "ID copiado al portapapeles!");
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const updateSelected = useCallback(
      (patch: Partial<Node>) => {
        if (!selected) return;
        setNodes((nds) =>
          nds.map((n) =>
            n.id === selected.id
              ? { ...n, ...patch, data: { ...n.data, ...(patch as any).data } }
              : n,
          ),
        );
        setSelected((s) =>
          s
            ? ({
                ...s,
                ...patch,
                data: { ...s.data, ...(patch as any).data },
              } as Node)
            : s,
        );
        // limpiar edges de options si cambió cantidad
        if (
          selected.type === "options" &&
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
                  e.source === selected.id &&
                  e.sourceHandle &&
                  !handles.has(e.sourceHandle)
                ),
            ),
          );
        }
      },
      [selected, setNodes, setEdges],
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
        const pos = rfRef.current?.project?.({
          x: e.clientX - bounds.left,
          y: e.clientY - bounds.top,
        });
        const id = makeId();
        const data = { name: `${type}-${id}`, ...getStarterData(type) };
        setNodes((nds) =>
          nds.concat({ id, type, position: pos || { x: 0, y: 0 }, data }),
        );
      },
      [setNodes],
    );

    const onDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }, []);

    // import / export
    const handleImport = (e: any) => {
      const file =
        e?.target?.files?.[0] ||
        e?.target?.files?.item?.(0) ||
        e?.target?.files?.[0] ||
        e?.target?.files?.[0];
      const f = e?.target?.files?.[0] ?? e?.target?.files?.item?.(0);
      const picked =
        (e?.target?.files && e.target.files[0]) ||
        e?.target?.files?.item?.(0) ||
        e?.target?.files?.[0] ||
        e?.target?.files?.[0];
      const real = file || f || picked;
      const chosen = real ?? e?.target?.files?.[0];
      const selectedFile = chosen;
      const fileToUse = selectedFile || e?.target?.files?.[0];
      const finalFile = fileToUse || e?.target?.files?.[0];
      const fileObj = selectedFile || finalFile;
      const pickedFile = fileObj || e?.target?.files?.[0];

      const useFile = pickedFile || e?.target?.files?.[0];
      const selected = useFile || e?.target?.files?.[0];
      const fileX = selected || e?.target?.files?.[0];

      const fileFinal = fileX || e?.target?.files?.[0];
      const fileOk = fileFinal ?? e?.target?.files?.[0];

      const fileReal = fileOk || e?.target?.files?.[0];
      const fileChosen = fileReal ?? e?.target?.files?.[0];

      const fileUse = fileChosen || e?.target?.files?.[0];

      const fileToRead = fileUse || e?.target?.files?.[0];
      const f2 = fileToRead;

      const fileIn = f2 ?? e?.target?.files?.[0];

      const fileReady = fileIn || e?.target?.files?.[0];

      const fileCandidate = fileReady || e?.target?.files?.[0];
      const finalPick = fileCandidate ?? e?.target?.files?.[0];

      const fileObjFinal = finalPick;

      const fileRealUse = fileObjFinal || file;
      const freader = new FileReader();
      const chosenFile = fileRealUse || e?.target?.files?.[0];

      const fileInput = chosenFile;
      const fileToReadReal = fileInput;

      const f0 = fileToReadReal;
      const fileR = f0;
      const realFile = fileR;
      const fReader = new FileReader();

      const chosenOk = realFile || e?.target?.files?.[0];
      const INPUT = chosenOk;

      const chosenOne = INPUT || e?.target?.files?.[0];
      const fileChosenOk = chosenOne;

      const fileUseIt = fileChosenOk;
      const reader = new FileReader();

      const fileFinalOk = fileUseIt;
      if (!fileFinalOk) return;
      reader.onload = () => {
        try {
          const json = JSON.parse(String(reader.result));
          if (!Array.isArray(json.nodes) || !Array.isArray(json.edges))
            throw new Error("Invalid file");
          setNodes(json.nodes);
          setEdges(json.edges);
          toast.success("Flujo importado");
          setTimeout(() => rfRef.current?.fitView?.({ padding: 0.2 }), 0);
        } catch {
          toast.error("Error al importar");
        }
      };
      reader.readAsText(fileFinalOk);
      // limpia input para permitir reimportar mismo archivo
      if (e?.target?.value !== undefined) e.target.value = "";
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
        if (n.type !== "end" && !edges.some((e) => e.source === n.id)) {
          if (n.type !== "options" && n.type !== "condition") {
            problems.push(`${n.id}: sin conexión de salida`);
          }
        }
        if (n.type !== "trigger" && !edges.some((e) => e.target === n.id)) {
          problems.push(`${n.id}: inaccesible (sin conexión entrante)`);
        }
      });

      if (problems.length) problems.forEach((p) => toast.error(p));
      else toast.success("Todo bien! El flujo parece válido.");
    };

    // auto layout
    const doAutoLayout = () => {
      const layout = getLayoutedElements(nodes, edges, "TB");
      setNodes(layout.nodes);
    };

    // undo / redo (snapshot stack)
    const historyRef = useRef<{ past: string[]; future: string[] }>({
      past: [],
      future: [],
    });
    useEffect(() => {
      historyRef.current.past.push(JSON.stringify({ nodes, edges }));
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
    }, [setNodes, setEdges]);

    const redo = useCallback(() => {
      const next = historyRef.current.future.pop();
      if (!next) return;
      historyRef.current.past.push(next);
      const state = JSON.parse(next);
      setNodes(state.nodes);
      setEdges(state.edges);
    }, [setNodes, setEdges]);

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

    return (
      <div className="h-screen w-full grid grid-cols-12 gap-0">
        <div className="col-span-12">
          <Topbar
            onNew={() => {
              setNodes(defaultNodes);
              setEdges(defaultEdges);
              setSelected(null);
              toast.message("Nuevo flujo creado");
              setTimeout(() => rfRef.current?.fitView?.({ padding: 0.2 }), 0);
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
          <Palette onAdd={(type) => addNode(type)} />
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
            fitView
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onSelectionChange={(sel) => {
              const ids = (sel?.nodes || []).map((n) => n.id);
              setSelectedIds(ids);
              setSelected((sel?.nodes || [])[0] ?? null);
            }}
            onMoveEnd={onMoveEnd}
            defaultEdgeOptions={{
              type: "smoothstep",
              markerEnd: { type: MarkerType.ArrowClosed },
            }}
            // Calidad de vida
            snapToGrid
            snapGrid={[8, 8]}
            selectionOnDrag
            panOnDrag={[1, 2]} // botón izquierdo y medio
            panOnScroll
            zoomOnScroll
            zoomOnPinch
            panOnScrollSpeed={0.8}
            elevateNodesOnSelect
            selectionMode="partial"
            deleteKeyCode={null} // lo manejamos nosotros
          >
            <Background variant="dots" gap={16} size={1} />
            <MiniMap zoomable pannable />
            <Controls />
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
