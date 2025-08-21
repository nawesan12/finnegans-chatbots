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
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion } from "framer-motion";
import {
  Play,
  Save,
  Upload,
  Download,
  Trash2,
  LayoutList,
  Wand2,
  FileUp,
  MessageSquare,
  Filter,
  Clock3,
  Code2,
  Variable,
  Image as ImageIcon,
  Headphones,
  GitBranch,
  Flag,
  Link2,
  Rocket,
  CheckCircle2,
  Bug,
  Redo2,
  Undo2,
  ZoomIn,
  ZoomOut,
  Search,
} from "lucide-react";
// shadcn/ui primitives
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import dagre from "dagre";
import { z } from "zod";

// ---------------------------------------------
// Types & Schemas
// ---------------------------------------------
const waTextLimit = 4096; // WhatsApp text limit (practical safe size)

const BaseDataSchema = z.object({
  name: z.string().min(1).max(60).default(""),
});

const TriggerDataSchema = BaseDataSchema.extend({
  keyword: z.string().min(1).max(64),
});

const MessageDataSchema = BaseDataSchema.extend({
  text: z.string().min(1).max(waTextLimit),
  useTemplate: z.boolean().default(false),
});

const OptionsDataSchema = BaseDataSchema.extend({
  options: z.array(z.string().min(1).max(30)).min(2).max(10),
});

const DelayDataSchema = BaseDataSchema.extend({
  seconds: z.number().min(1).max(3600).default(1),
});

const ConditionDataSchema = BaseDataSchema.extend({
  expression: z.string().min(1).max(500), // JS-like expression on context vars
});

const APICallDataSchema = BaseDataSchema.extend({
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("POST"),
  headers: z.record(z.string(), z.string()).default({}),
  body: z.string().default(""),
  assignTo: z.string().default("apiResult"),
});

const AssignVarDataSchema = BaseDataSchema.extend({
  key: z.string().min(1).max(50),
  value: z.string().max(500),
});

const MediaDataSchema = BaseDataSchema.extend({
  mediaType: z.enum(["image", "document", "video", "audio"]).default("image"),
  url: z.string().url(),
  caption: z.string().max(1024).optional(),
});

const HandoffDataSchema = BaseDataSchema.extend({
  queue: z.string().min(1),
  note: z.string().max(500).optional(),
});

const EndDataSchema = BaseDataSchema.extend({
  reason: z.string().default("end"),
});

// ---------------------------------------------
// Helpers
// ---------------------------------------------
const nodeWidth = 280;
const nodeHeight = 100;

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

import { Node, Edge } from "reactflow";

const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction = "TB"
) => {
  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction, nodesep: 40, ranksep: 80 });

  nodes.forEach((n) =>
    dagreGraph.setNode(n.id, { width: nodeWidth, height: nodeHeight }),
  );
  edges.forEach((e) => dagreGraph.setEdge(e.source, e.target));

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((n) => {
    const { x, y } = dagreGraph.node(n.id);
    return { ...n, position: { x: x - nodeWidth / 2, y: y - nodeHeight / 2 } };
  });

  return { nodes: layoutedNodes, edges };
};

const makeId = () => Math.random().toString(36).slice(2, 9);

// ---------------------------------------------
// Node Renderers
// ---------------------------------------------
const Shell = ({
  icon: Icon,
  title,
  children,
  color,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  color: string;
}) => (
  <div className={`w-[280px] rounded-2xl shadow-sm border ${color} bg-white`}>
    <div className="flex items-center gap-2 px-4 py-2 border-b">
      <Icon className="h-4 w-4" />
      <h4 className="font-semibold text-sm">{title}</h4>
    </div>
    <div className="p-3 text-sm space-y-2">{children}</div>
  </div>
);

const CommonHandles = ({ top = false, bottom = true }) => (
  <>
    {top && <Handle type="target" position={Position.Top} />}
    {bottom && <Handle type="source" position={Position.Bottom} />}
  </>
);

const TriggerNode = ({ data }) => (
  <div>
    <Shell icon={FileUp} title="Trigger" color="border-green-300">
      <div className="text-muted-foreground">
        Keyword: <Badge variant="secondary">{data.keyword}</Badge>
      </div>
    </Shell>
    <CommonHandles top={false} bottom={true} />
  </div>
);

const MessageNode = ({ data }) => (
  <div>
    <Shell icon={MessageSquare} title="Message" color="border-blue-300">
      {data.useTemplate ? <Badge variant="outline">Template</Badge> : null}
      <div className="whitespace-pre-wrap break-words bg-muted/30 p-2 rounded-lg max-h-40 overflow-auto">
        {data.text}
      </div>
    </Shell>
    <CommonHandles top bottom />
  </div>
);

const OptionsNode = ({ data }) => (
  <div>
    <Shell icon={Filter} title="Options" color="border-yellow-300">
      <ul className="space-y-1">
        {data.options?.map((opt, idx) => (
          <li key={idx} className="border rounded px-2 py-1 text-xs">
            {opt}
          </li>
        ))}
      </ul>
    </Shell>
    {/* one target on top, multiple sources along bottom */}
    <Handle type="target" position={Position.Top} />
    {data.options?.map((opt, i) => (
      <Handle
        key={i}
        id={`opt-${i}`}
        type="source"
        position={Position.Bottom}
        style={{ left: 20 + i * (240 / Math.max(1, data.options.length - 1)) }}
      />
    ))}
  </div>
);

const DelayNode = ({ data }) => (
  <div>
    <Shell icon={Clock3} title="Delay" color="border-orange-300">
      <div>
        Wait <b>{data.seconds}</b> seconds
      </div>
    </Shell>
    <CommonHandles top bottom />
  </div>
);

const ConditionNode = ({ data }) => (
  <div>
    <Shell icon={GitBranch} title="Condition" color="border-purple-300">
      <code className="text-xs bg-muted/40 px-2 py-1 rounded block overflow-auto max-h-24">
        {data.expression}
      </code>
      <div className="text-xs text-muted-foreground">
        True → bottom-left, False → bottom-right
      </div>
    </Shell>
    <Handle type="target" position={Position.Top} />
    <Handle
      type="source"
      id="true"
      position={Position.Bottom}
      style={{ left: 80 }}
    />
    <Handle
      type="source"
      id="false"
      position={Position.Bottom}
      style={{ left: 200 }}
    />
  </div>
);

const APICallNode = ({ data }) => (
  <div>
    <Shell icon={Code2} title="API Call" color="border-cyan-300">
      <div className="text-xs">
        <div className="truncate">
          <b>{data.method}</b> {data.url}
        </div>
        <div>
          → <Badge variant="secondary">{data.assignTo}</Badge>
        </div>
      </div>
    </Shell>
    <CommonHandles top bottom />
  </div>
);

const AssignVarNode = ({ data }) => (
  <div>
    <Shell icon={Variable} title="Set Variable" color="border-rose-300">
      <div className="text-xs">
        <b>{data.key}</b> = <code className="break-all">{data.value}</code>
      </div>
    </Shell>
    <CommonHandles top bottom />
  </div>
);

const MediaNode = ({ data }) => (
  <div>
    <Shell icon={ImageIcon} title="Send Media" color="border-teal-300">
      <div className="text-xs">
        {data.mediaType.toUpperCase()} • {data.url}
      </div>
      {data.caption && (
        <div className="text-xs text-muted-foreground">{data.caption}</div>
      )}
    </Shell>
    <CommonHandles top bottom />
  </div>
);

const HandoffNode = ({ data }) => (
  <div>
    <Shell icon={Headphones} title="Human Handoff" color="border-fuchsia-300">
      <div className="text-xs">
        Queue: <b>{data.queue}</b>
      </div>
      {data.note && (
        <div className="text-xs text-muted-foreground">{data.note}</div>
      )}
    </Shell>
    <CommonHandles top bottom />
  </div>
);

const GoToNode = ({ data }) => (
  <div>
    <Shell icon={Link2} title="Go To" color="border-slate-300">
      <div className="text-xs">
        Jump to:{" "}
        <Badge variant="outline">{data.targetNodeId || "(select)"}</Badge>
      </div>
    </Shell>
    <CommonHandles top bottom />
  </div>
);

const EndNode = ({ data }) => (
  <div>
    <Shell icon={Flag} title="End" color="border-gray-300">
      <div className="text-xs text-muted-foreground">
        {data.reason || "end"}
      </div>
    </Shell>
    <Handle type="target" position={Position.Top} />
  </div>
);

const nodeTypes = {
  trigger: TriggerNode,
  message: MessageNode,
  options: OptionsNode,
  delay: DelayNode,
  condition: ConditionNode,
  api: APICallNode,
  assign: AssignVarNode,
  media: MediaNode,
  handoff: HandoffNode,
  goto: GoToNode,
  end: EndNode,
};

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

// ---------------------------------------------
// Inspector Panel
// ---------------------------------------------
function Inspector({ selectedNode, onChange, allNodes }) {
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
                } catch {}
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

// ---------------------------------------------
// Simulator
// ---------------------------------------------
function Simulator({ nodes, edges }) {
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
          // eslint-disable-next-line no-new-func
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

// ---------------------------------------------
// Toolbar
// ---------------------------------------------
function Topbar({
  onNew,
  onImport,
  onExport,
  onValidate,
  onAutoLayout,
  onUndo,
  onRedo,
  zoomIn,
  zoomOut,
  selectedId,
}) {
  const fileRef = useRef(null);
  return (
    <div className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b px-3 py-2 flex items-center gap-2">
      <Button variant="secondary" onClick={onNew}>
        <Wand2 className="h-4 w-4 mr-2" />
        Nuevo
      </Button>
      <Button variant="secondary" onClick={() => fileRef.current?.click()}>
        <Upload className="h-4 w-4 mr-2" />
        Importar
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={onImport}
      />
      <Button onClick={onExport}>
        <Download className="h-4 w-4 mr-2" />
        Exportar
      </Button>
      <Separator orientation="vertical" className="mx-2" />
      <Button variant="outline" onClick={onValidate}>
        <CheckCircle2 className="h-4 w-4 mr-2" />
        Validar
      </Button>
      <Button variant="outline" onClick={onAutoLayout}>
        <LayoutList className="h-4 w-4 mr-2" />
        Auto-Acomodar
      </Button>
      <Separator orientation="vertical" className="mx-2" />
      <Button variant="ghost" onClick={onUndo}>
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" onClick={onRedo}>
        <Redo2 className="h-4 w-4" />
      </Button>
      <div className="ml-auto flex items-center gap-1">
        {selectedId && <Badge variant="outline">Selected: {selectedId}</Badge>}
        <Button variant="ghost" onClick={zoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="ghost" onClick={zoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

FlowBuilder.displayName = "FlowBuilder";

export default FlowBuilder;

// ---------------------------------------------
// Palette
// ---------------------------------------------
const palette = [
  {
    type: "trigger",
    label: "Entrante",
    icon: FileUp,
    hint: "Palabra clave que inicia el flujo",
  },
  {
    type: "message",
    label: "Mensaje",
    icon: MessageSquare,
    hint: "Enviar texto (plantillas admitidas)",
  },
  {
    type: "options",
    label: "Opciones",
    icon: Filter,
    hint: "Mostrar opciones rápidas",
  },
  { type: "delay", label: "Retraso", icon: Clock3, hint: "Esperar N segundos" },
  {
    type: "condition",
    label: "Condición",
    icon: GitBranch,
    hint: "Rama con expresión",
  },
  {
    type: "api",
    label: "Llamada API",
    icon: Code2,
    hint: "Obtener datos externos",
  },
  {
    type: "assign",
    label: "Variable",
    icon: Variable,
    hint: "context.var = value",
  },
  {
    type: "media",
    label: "Enviar Recurso",
    icon: ImageIcon,
    hint: "Image/Doc/Video/Audio",
  },
  {
    type: "handoff",
    label: "Enviar a Agente",
    icon: Headphones,
    hint: "Route to agent",
  },
  { type: "goto", label: "Ir a", icon: Link2, hint: "Saltar a nodo" },
  { type: "end", label: "Fin", icon: Flag, hint: "Finalizar flujo" },
];

function Palette({ onAdd }) {
  const [query, setQuery] = useState("");
  const items = palette.filter((p) =>
    p.label.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar nodos"
        />
        <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
      </div>
      <div className="grid grid-cols-1 gap-2">
        {items.map((p) => (
          <motion.button
            key={p.type}
            onClick={() => onAdd(p.type)}
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-3 p-3 rounded-2xl border hover:shadow-sm text-left"
          >
            <p.icon className="h-5 w-5" />
            <div>
              <div className="font-medium">{p.label}</div>
              <div className="text-xs text-muted-foreground">{p.hint}</div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------
// Main Component
// ---------------------------------------------
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
    const starters = {
      trigger: { keyword: "/start" },
      message: { text: "Nuevo mensaje", useTemplate: false },
      options: { options: ["Opcion 1", "Opcion 2"] },
      delay: { seconds: 1 },
      condition: { expression: "context.input.includes('ok')" },
      api: {
        url: "https://api.example.com",
        method: "POST",
        headers: {},
        body: "{}",
        assignTo: "apiResult",
      },
      assign: { key: "name", value: "John" },
      media: {
        mediaType: "image",
        url: "https://placekitten.com/400/300",
        caption: "A cat",
      },
      handoff: { queue: "Default", note: "VIP" },
      goto: { targetNodeId: "" },
      end: { reason: "end" },
    };
    const data = { name: `${type}-${id}`, ...(starters[type] || {}) };
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
  };

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("application/wa-node");
      if (!type) return;
      const pos = rfRef.current?.project({ x: e.clientX, y: e.clientY });
      const id = makeId();
      const starters = {
        trigger: { keyword: "/start" },
        message: { text: "New message", useTemplate: false },
        options: { options: ["Option 1", "Option 2"] },
        delay: { seconds: 1 },
        condition: { expression: "context.input.includes('ok')" },
        api: {
          url: "https://api.example.com",
          method: "POST",
          headers: {},
          body: "{}",
          assignTo: "apiResult",
        },
        assign: { key: "name", value: "John" },
        media: {
          mediaType: "image",
          url: "https://placekitten.com/400/300",
          caption: "A cat",
        },
        handoff: { queue: "Default", note: "VIP" },
        goto: { targetNodeId: "" },
        end: { reason: "end" },
      };
      const data = { name: `${type}-${id}`, ...(starters[type] || {}) };
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
        toast.success("Imported flow");
      } catch (err) {
        toast.error("Import failed");
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const payload = JSON.stringify({ nodes, edges }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `whatsapp-flow-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // validation
  const validate = () => {
    const problems = [];
    const triggers = nodes.filter((n) => n.type === "trigger");
    const triggerSet = new Set(
      triggers.map((t) => t.data.keyword?.toLowerCase()),
    );
    if (triggerSet.size !== triggers.length)
      problems.push("Duplicate trigger keywords");
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
          problems.push(`${n.id}: has no outgoing edge`);
        }
      }
      if (n.type !== "trigger" && !edges.some((e) => e.target === n.id)) {
        problems.push(`${n.id}: unreachable (no incoming edge)`);
      }
    });
    if (problems.length) {
      problems.forEach((p) => toast.error(p));
    } else {
      toast.success("All good! Flow looks valid.");
    }
  };

  // auto layout
  const doAutoLayout = () => {
    const layout = getLayoutedElements(nodes, edges, "TB");
    setNodes(layout.nodes);
  };

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleExport();
      }
      if (e.key === "" || e.key === "") {
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
  }, [selected, setNodes, setEdges]);

  // undo / redo (simple snapshot stack)
  const historyRef = useRef({ past: [], future: [] });
  useEffect(() => {
    historyRef.current.past.push(JSON.stringify({ nodes, edges }));
    historyRef.current.future = [];
  }, [nodes, edges]);

  const undo = () => {
    const past = historyRef.current.past;
    if (past.length <= 1) return;
    const current = past.pop();
    historyRef.current.future.push(current);
    const prev = JSON.parse(past[past.length - 1]);
    setNodes(prev.nodes);
    setEdges(prev.edges);
  };
  const redo = () => {
    const next = historyRef.current.future.pop();
    if (!next) return;
    historyRef.current.past.push(next);
    const state = JSON.parse(next);
    setNodes(state.nodes);
    setEdges(state.edges);
  };

  // zoom controls
  const zoomIn = () => rfRef.current?.zoomIn?.();
  const zoomOut = () => rfRef.current?.zoomOut?.();

  // dnd from palette
  const onPaletteDragStart = (e, type) => {
    e.dataTransfer.setData("application/wa-node", type);
    e.dataTransfer.effectAllowed = "move";
  };

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

  return (
    <div className="h-screen w-full grid grid-cols-12 gap-0">
      <div className="col-span-12">
        <Topbar
          onNew={() => {
            setNodes(defaultNodes);
            setEdges(defaultEdges);
            setSelected(null);
            toast.message("New flow created");
          }}
          onImport={handleImport}
          onExport={handleExport}
          onValidate={validate}
          onAutoLayout={doAutoLayout}
          onUndo={undo}
          onRedo={redo}
          zoomIn={zoomIn}
          zoomOut={zoomOut}
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
          Consejo: arrastra desde esta lista al lienzo también.
        </div>
        <div className="mt-2 grid gap-2">
          {palette.map((p) => (
            <div
              key={p.type}
              draggable
              onDragStart={(e) => onPaletteDragStart(e, p.type)}
              className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30"
            >
              <p.icon className="h-4 w-4" /> {p.label}
            </div>
          ))}
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
          nodeTypes={nodeTypes}
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
        <Inspector
          selectedNode={selected}
          onChange={updateSelected}
          allNodes={nodes}
        />
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
}
