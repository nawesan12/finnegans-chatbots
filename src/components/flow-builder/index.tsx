"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
  MarkerType,
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

const defaultNodes = [
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

const defaultEdges = [
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

const FlowBuilder = React.forwardRef(({ initialFlow }, ref) => {
  // nodes / edges
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
  const [selected, setSelected] = useState(null);
  const rfRef = useRef(null);

  // Load initial flow from prop
  useEffect(() => {
    if (initialFlow && initialFlow.nodes && initialFlow.edges) {
      setNodes(initialFlow.nodes);
      setEdges(initialFlow.edges);
    }
  }, [initialFlow, setNodes, setEdges]);

  // Expose a function to get the current flow data
  React.useImperativeHandle(ref, () => ({
    getFlowData: () => {
      return { nodes, edges };
    },
  }));

  // add node
  const addNode = (type) => {
    const id = makeId();
    const y = (nodes.at(-1)?.position?.y || 0) + 140;
    const x = nodes.at(-1)?.position?.x || 0;
    const data = { name: `${type}-${id}`, ...getStarterData(type) };
    setNodes((nds) => nds.concat({ id, type, data, position: { x, y } }));
  };

  const onConnect = useCallback(
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

  const onNodeClick = (_, node) => setSelected(node);
  const onPaneClick = () => setSelected(null);

  const handleEdit = useCallback(
    (node) => {
      setSelected(node);
    },
    [setSelected],
  );

  const handleDuplicate = useCallback(
    (node) => {
      const newNode = {
        ...node,
        id: makeId(),
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
    (nodeId) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter((ed) => ed.source !== nodeId && ed.target !== nodeId),
      );
    },
    [setNodes, setEdges],
  );

  const handleCopyWebhook = useCallback((node) => {
    const webhookUrl = `${window.location.origin}/api/webhook?flowId=${node.id}`;
    navigator.clipboard.writeText(webhookUrl);
    toast.success("URL del webhook copiada al portapapeles!");
  }, []);

  const handleCopyId = useCallback((nodeId: string) => {
    navigator.clipboard.writeText(nodeId);
    toast.success("ID copiado al portapapeles!");
  }, []);

  const updateSelected = (patch) => {
    if (!selected) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selected.id
          ? { ...n, ...patch, data: { ...n.data, ...(patch.data || {}) } }
          : n,
      ),
    );
    setSelected((s) => ({
      ...s,
      ...patch,
      data: { ...s.data, ...(patch.data || {}) },
    }));
    if (
      selected.type === "options" &&
      patch.data &&
      Object.prototype.hasOwnProperty.call(patch.data, "options")
    ) {
      const opts = patch.data.options || [];
      const handles = new Set(opts.map((_: unknown, i: number) => `opt-${i}`));
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
  };

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("application/wa-node");
      if (!type) return;
      const pos = rfRef.current?.project({ x: e.clientX, y: e.clientY });
      const id = makeId();
      const data = { name: `${type}-${id}`, ...getStarterData(type) };
      setNodes((nds) =>
        nds.concat({ id, type, position: pos || { x: 0, y: 0 }, data }),
      );
    },
    [setNodes],
  );

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  // import / export
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result));
        if (!Array.isArray(json.nodes) || !Array.isArray(json.edges))
          throw new Error("Invalid file");
        setNodes(json.nodes);
        setEdges(json.edges);
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
  }, [nodes, edges]);

  // validation
  const validate = () => {
    const problems = [];
    const triggers = nodes.filter((n) => n.type === "trigger");
    const triggerSet = new Set(
      triggers.map((t) => t.data.keyword?.toLowerCase()),
    );
    if (triggerSet.size !== triggers.length)
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
    if (problems.length) {
      problems.forEach((p) => toast.error(p));
    } else {
      toast.success("Todo bien! El flujo parece válido.");
    }
  };

  // auto layout
  const doAutoLayout = () => {
    const layout = getLayoutedElements(nodes, edges, "TB");
    setNodes(layout.nodes);
  };

  // undo / redo (simple snapshot stack)
  const historyRef = useRef({ past: [], future: [] });
  useEffect(() => {
    historyRef.current.past.push(JSON.stringify({ nodes, edges }));
    historyRef.current.future = [];
  }, [nodes, edges]);

  const undo = useCallback(() => {
    const past = historyRef.current.past;
    if (past.length <= 1) return;
    const current = past.pop();
    historyRef.current.future.push(current);
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
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleExport();
      }
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
      if (e.key === "Delete" || e.key === "Backspace") {
        setNodes((nds) => nds.filter((n) => n.id !== selected?.id));
        setEdges((eds) =>
          eds.filter(
            (ed) => ed.source !== selected?.id && ed.target !== selected?.id,
          ),
        );
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, setNodes, setEdges, handleExport, undo, redo]);

  // zoom controls
  const zoomIn = () => rfRef.current?.zoomIn?.();
  const zoomOut = () => rfRef.current?.zoomOut?.();
  const fitView = () => rfRef.current?.fitView?.();

  // export to WhatsApp Cloud API-ish actions (spec outline)
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

  const memoizedNodeTypes = React.useMemo(() => {
    const customNodeTypes = {};
    for (const [key, NodeType] of Object.entries(nodeTypes)) {
      customNodeTypes[key] = (props) => (
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
    return customNodeTypes;
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
          onAutoLayout={doAutoLayout}
          onUndo={undo}
          onRedo={redo}
          zoomIn={zoomIn}
          zoomOut={zoomOut}
          fitView={fitView}
          selectedId={selected?.id}
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
          Consejo: clickea o arrastra nodos al lienzo.
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
          defaultEdgeOptions={{
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed },
          }}
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
              • Mantene los mensajes por debajo de los {waTextLimit} caracteres.
            </div>
            <div>• Usa Opciones (quick replies) para hacer menús.</div>
            <div>• Usa Delay para evitar atosigar a los usuarios.</div>
            <div>
              • Condition se puede ramificar en base al <code>contexto</code> y
              los resultados de la API.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

FlowBuilder.displayName = "FlowBuilder";

export default FlowBuilder;
