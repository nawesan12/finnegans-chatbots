import { Node, Edge } from "reactflow";
import dagre from "dagre";
import type { FlowNodeDataMap, FlowNodeType } from "./types";

/** Defaults – se usan si el nodo no declara width/height */
const DEFAULT_NODE_WIDTH = 280;
const DEFAULT_NODE_HEIGHT = 100;

/** Direcciones válidas para dagre */
type LayoutDirection = "TB" | "BT" | "LR" | "RL";

type LayoutOptions = {
  /** Separación horizontal entre nodos del mismo nivel (dagre nodesep) */
  nodesep?: number;
  /** Separación vertical entre niveles (dagre ranksep) */
  ranksep?: number;
  /** Agrega padding a todas las posiciones resultantes */
  padding?: { x?: number; y?: number };
  /** Ajusta las posiciones a una grilla (p.ej. 8px) */
  snapToGrid?: number | false;
  /** Traslada todo el layout para que el min x/y quede en 0,0 (más prolijo para fitView) */
  translateToOrigin?: boolean;
};

/** Obtiene el tamaño del nodo desde distintas fuentes, con fallback seguro */
const parseStyleDimension = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
};

const getNodeSize = (n: Node): { width: number; height: number } => {
  let width = typeof n.width === "number" ? n.width : DEFAULT_NODE_WIDTH;
  let height = typeof n.height === "number" ? n.height : DEFAULT_NODE_HEIGHT;

  const styleWidth = parseStyleDimension(n.style?.width);
  const styleHeight = parseStyleDimension(n.style?.height);

  if (styleWidth !== null) {
    width = styleWidth;
  }
  if (styleHeight !== null) {
    height = styleHeight;
  }

  return { width, height };
};

/** Snappea un número a la grilla si corresponde */
const snap = (v: number, grid?: number | false) =>
  grid && grid > 1 ? Math.round(v / grid) * grid : v;

export const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction: LayoutDirection = "TB",
  options: LayoutOptions = {},
) => {
  const {
    nodesep = 40,
    ranksep = 80,
    padding = { x: 0, y: 0 },
    snapToGrid = false,
    translateToOrigin = false,
  } = options;

  // Grafo nuevo por ejecución (evita estado compartido)
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep, ranksep });

  // Definir nodos con sus tamaños
  nodes.forEach((n) => {
    const { width, height } = getNodeSize(n);
    g.setNode(n.id, { width, height });
  });

  // Definir aristas (dagre no usa handles, sólo relación)
  edges.forEach((e) => {
    if (e.source && e.target) g.setEdge(e.source, e.target);
  });

  // Calcular layout
  dagre.layout(g);

  // Obtener los nodos posicionados (centrados según tamaño)
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;

  const layoutedNodes = nodes.map((n) => {
    const pos = g.node(n.id);
    // Si por alguna razón dagre no devolvió el nodo (edge huérfana, etc.), conservar posición previa
    if (!pos) return n;

    const { width, height } = getNodeSize(n);
    const x = pos.x - width / 2 + (padding.x || 0);
    const y = pos.y - height / 2 + (padding.y || 0);

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);

    return {
      ...n,
      position: {
        x: snap(x, snapToGrid),
        y: snap(y, snapToGrid),
      },
    };
  });

  // Trasladar todo el layout al origen si se pide
  let finalNodes = layoutedNodes;
  if (translateToOrigin) {
    const dx = Math.min(0, minX);
    const dy = Math.min(0, minY);
    if (dx !== 0 || dy !== 0) {
      finalNodes = layoutedNodes.map((n) => ({
        ...n,
        position: {
          x: snap(n.position.x - dx, snapToGrid),
          y: snap(n.position.y - dy, snapToGrid),
        },
      }));
    }
  }

  // Devolver edges tal cual (compatibilidad total)
  return { nodes: finalNodes, edges };
};

/** ID corto, con fallback a random si no hay crypto */
export const makeId = () => {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return (crypto.randomUUID() || "").replace(/-/g, "").slice(0, 9);
    }
  } catch {
    // ignore
  }
  return Math.random().toString(36).slice(2, 11);
};

export const getStarterData = <T extends FlowNodeType>(
  type: T,
): Omit<FlowNodeDataMap[T], "name"> => {
  const starters: { [K in FlowNodeType]: Omit<FlowNodeDataMap[K], "name"> } = {
    trigger: { keyword: "/start" },
    message: {
      text: "Nuevo mensaje",
      useTemplate: false,
      templateName: "",
      templateLanguage: "",
      templateParameters: [],
    },
    options: { options: ["Opcion 1", "Opcion 2"] },
    delay: { seconds: 1 },
    condition: {
      expression: "context.input?.toLowerCase?.().includes('ok')",
    },
  api: {
    url: "https://api.example.com/resource",
    method: "POST",
    headers: {},
    body: '{"echo":"{{ input }}"}',
    assignTo: "apiResult",
  },
  assign: { key: "name", value: "John" },
  media: {
    mediaType: "image",
    url: "https://placekitten.com/400/300",
    caption: "A cat",
  },
  whatsapp_flow: {
    header: "Completar información",
    body: "Abrí el Flow de WhatsApp para continuar con tu solicitud.",
    footer: "Gracias por tu tiempo",
    cta: "Abrir Flow",
  },
  handoff: { queue: "Default", note: "VIP" },
  goto: { targetNodeId: "" },
  end: { reason: "end" },
  };
  return starters[type];
};
