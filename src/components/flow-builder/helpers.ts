import { Node, Edge } from "reactflow";
import dagre from "dagre";

const nodeWidth = 280;
const nodeHeight = 100;

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

export const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction = "TB"
) => {
  dagreGraph.setGraph({ rankdir: direction, nodesep: 40, ranksep: 80 });

  nodes.forEach((n) =>
    dagreGraph.setNode(n.id, { width: nodeWidth, height: nodeHeight })
  );
  edges.forEach((e) => dagreGraph.setEdge(e.source, e.target));

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((n) => {
    const { x, y } = dagreGraph.node(n.id);
    return { ...n, position: { x: x - nodeWidth / 2, y: y - nodeHeight / 2 } };
  });

  return { nodes: layoutedNodes, edges };
};

export const makeId = () => Math.random().toString(36).slice(2, 9);

export const getStarterData = (type: string) => {
  const starters: Record<string, unknown> = {
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
  return starters[type] || {};
};
