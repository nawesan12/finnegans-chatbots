import { PrismaClient, Session } from "@prisma/client";
import { z } from "zod";
import {
  Node,
  Edge,
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
  GoToDataSchema,
} from "@/components/flow-builder/types";

const prisma = new PrismaClient();

// Infer types from Zod schemas
type TriggerData = z.infer<typeof TriggerDataSchema>;
type MessageData = z.infer<typeof MessageDataSchema>;
type OptionsData = z.infer<typeof OptionsDataSchema>;
type DelayData = z.infer<typeof DelayDataSchema>;
type ConditionData = z.infer<typeof ConditionDataSchema>;
type APICallData = z.infer<typeof APICallDataSchema>;
type AssignVarData = z.infer<typeof AssignVarDataSchema>;
type MediaData = z.infer<typeof MediaDataSchema>;
type HandoffData = z.infer<typeof HandoffDataSchema>;
type EndData = z.infer<typeof EndDataSchema>;
type GoToData = z.infer<typeof GoToDataSchema>;

// Define a more specific Node type
type FlowNode = Node<
  | TriggerData
  | MessageData
  | OptionsData
  | DelayData
  | ConditionData
  | APICallData
  | AssignVarData
  | MediaData
  | HandoffData
  | EndData
  | GoToData
>;

interface FlowData {
  nodes: FlowNode[];
  edges: Edge[];
}

type SendMessage = (
  userId: string,
  to: string,
  message:
    | { type: "text"; text: string }
    | { type: "media"; mediaType: string; url: string; caption?: string }
    | { type: "options"; text: string; options: string[] },
) => Promise<void | boolean>;

// This function is now stateful and operates on a session
export async function executeFlow(
  session: Session & {
    flow: { definition: any; userId: string };
    contact: { phone: string };
  },
  messageText: string,
  sendMessage: SendMessage,
) {
  const SAFE_MAX_STEPS = 500;
  const MAX_DELAY_MS = 60_000; // cap delays to 60s/server safety
  const API_TIMEOUT_MS = 15_000;

  const flow = session.flow.definition as FlowData;
  const nodes = flow?.nodes ?? [];
  const edges = flow?.edges ?? [];

  // Fast indices
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const outgoingBySource = new Map<string, Edge[]>();
  for (const e of edges) {
    if (!e.source || !e.target) continue;
    const arr = outgoingBySource.get(e.source) ?? [];
    arr.push(e);
    outgoingBySource.set(e.source, arr);
  }

  // Context bag
  let context: Record<string, any> = (session.context as any) || {};
  const toLc = (s?: string) => (s ?? "").trim().toLowerCase();

  // --- tiny helpers ---
  const getFromPath = (obj: any, path: string) =>
    path.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), obj);

  const setByPath = (obj: any, path: string, val: any) => {
    const parts = path.split(".");
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++)
      cur = cur[parts[i]] ?? (cur[parts[i]] = {});
    cur[parts[parts.length - 1]] = val;
  };

  const tpl = (s?: string) =>
    (s ?? "").replace(/\{\{\s*([\w.[\]0-9]+)\s*\}\}/g, (_m, key) => {
      const v = getFromPath({ context }, key) ?? getFromPath(context, key);
      return v == null ? "" : String(v);
    });

  const safeEvalBool = (expr: string, ctx: Record<string, any>) => {
    // Basic sanitization—reject clearly unsafe tokens
    if (
      /[;{}]|process|global|window|document|require|import|\beval\b/g.test(expr)
    ) {
      throw new Error("Unsafe expression");
    }
    // eslint-disable-next-line no-new-func
    const fn = new Function("context", `return !!(${expr})`);
    return !!fn(ctx);
  };

  const chooseFirstEdge = (sourceId: string) =>
    (outgoingBySource.get(sourceId) ?? [])[0];

  const edgeForCondition = (sourceId: string, res: boolean) =>
    (outgoingBySource.get(sourceId) ?? []).find(
      (e) => e.sourceHandle === (res ? "true" : "false"),
    );

  const edgeForOption = (sourceId: string, handleId: string) =>
    (outgoingBySource.get(sourceId) ?? []).find(
      (e) => e.sourceHandle === handleId,
    );

  const updateSession = async (
    patch: Partial<Session> & {
      context?: any;
      currentNodeId?: string | null;
      status?: Session["status"];
    },
  ) => {
    await prisma.session.update({
      where: { id: session.id },
      data: patch as any,
    });
  };

  const apiCall = async (url: string, init: RequestInit) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      const txt = await res.text();
      try {
        return JSON.parse(txt);
      } catch {
        return txt;
      }
    } finally {
      clearTimeout(t);
    }
  };

  // --- Find starting node ---
  let currentNode: FlowNode | undefined;

  if (session.currentNodeId && session.status === "Paused") {
    const paused = nodeById.get(session.currentNodeId);
    if (!paused) {
      console.error(
        `Node ${session.currentNodeId} not found in flow ${session.flowId}`,
      );
      await updateSession({ status: "Errored" });
      return;
    }

    if (paused.type === "options") {
      // Resume from options
      const optionsData = paused.data as OptionsData;
      const idx = (optionsData.options || []).findIndex(
        (opt) => toLc(opt) === toLc(messageText),
      );

      let nextId: string | undefined;
      if (idx !== -1) {
        nextId = edgeForOption(paused.id, `opt-${idx}`)?.target;
      } else {
        nextId = edgeForOption(paused.id, "no-match")?.target;
      }

      currentNode = nextId
        ? (nodeById.get(nextId) as FlowNode | undefined)
        : undefined;
      if (nextId && !currentNode) {
        console.error(`Next node ${nextId} not found (resume)`);
        await updateSession({ status: "Errored" });
        return;
      }
      await updateSession({ status: "Active" });
    } else {
      currentNode = paused;
    }
  } else {
    // New / active session: match trigger
    const lc = toLc(messageText);
    currentNode = nodes.find(
      (n) =>
        n.type === "trigger" && toLc((n.data as TriggerData).keyword) === lc,
    ) as FlowNode | undefined;

    if (currentNode) {
      context.triggerMessage = messageText;
    } else {
      console.log(`No trigger for "${messageText}" in flow ${session.flowId}`);
      return;
    }
  }

  // --- Main loop ---
  const visited = new Set<string>();
  let steps = 0;

  try {
    while (currentNode) {
      if (steps++ > SAFE_MAX_STEPS) {
        await updateSession({ status: "Errored" });
        console.error("Guard limit reached");
        return;
      }
      if (visited.has(currentNode.id)) {
        await updateSession({ status: "Errored" });
        console.error("Loop detected at", currentNode.id);
        return;
      }
      visited.add(currentNode.id);

      await updateSession({ currentNodeId: currentNode.id, context });

      let nextNodeId: string | undefined;

      switch (currentNode.type) {
        case "trigger":
          // no-op
          break;

        case "message": {
          const data = currentNode.data as MessageData;
          await sendMessage(session.flow.userId, session.contact.phone, {
            type: "text",
            text: tpl(data.text),
          });
          break;
        }

        case "options": {
          const data = currentNode.data as OptionsData;
          await sendMessage(session.flow.userId, session.contact.phone, {
            type: "options",
            text: tpl((data as any).text ?? ""), // text might be optional in your schema
            options: data.options ?? [],
          });
          await updateSession({ status: "Paused" });
          return; // wait for user input
        }

        case "delay": {
          const data = currentNode.data as DelayData;
          const ms = Math.min(
            Math.max(0, (data.seconds ?? 0) * 1000),
            MAX_DELAY_MS,
          );
          if (ms > 0) await new Promise((r) => setTimeout(r, ms));
          break;
        }

        case "condition": {
          const data = currentNode.data as ConditionData;
          const expr = String(data.expression ?? "false");
          let res = false;
          try {
            res = safeEvalBool(expr, { ...context });
          } catch (e) {
            console.error("Condition error:", e);
            res = false;
          }
          nextNodeId = edgeForCondition(currentNode.id, res)?.target;
          break;
        }

        case "api": {
          const data = currentNode.data as APICallData;
          const method = String(data.method || "GET").toUpperCase();
          const url = tpl(data.url);
          const headersObj = data.headers ?? {};
          // Interpolate headers
          const headers = Object.fromEntries(
            Object.entries(headersObj).map(([k, v]) => [
              k,
              typeof v === "string" ? tpl(v) : v,
            ]),
          );
          const init: RequestInit = { method, headers };
          if (method !== "GET" && method !== "HEAD") {
            init.body = tpl(data.body ?? "");
          }
          try {
            const result = await apiCall(url, init);
            setByPath(context, data.assignTo ?? "apiResult", result);
          } catch (e) {
            console.error("API error:", e);
            setByPath(context, data.assignTo ?? "apiResult", {
              error: "API call failed",
            });
          }
          break;
        }

        case "assign": {
          const data = currentNode.data as AssignVarData;
          const key = data.key ?? "";
          if (key) setByPath(context, key, tpl(String(data.value ?? "")));
          break;
        }

        case "media": {
          const data = currentNode.data as MediaData;
          await sendMessage(session.flow.userId, session.contact.phone, {
            type: "media",
            mediaType: data.mediaType,
            url: tpl(data.url),
            caption: data.caption ? tpl(data.caption) : undefined,
          });
          break;
        }

        case "handoff": {
          await updateSession({ status: "Paused" });
          return; // agent picks up
        }

        case "goto": {
          const data = currentNode.data as GoToData;
          nextNodeId = data.targetNodeId;
          break;
        }

        case "end": {
          await updateSession({ status: "Completed", currentNodeId: null });
          return;
        }

        default:
          console.warn(`Unhandled node type: ${currentNode.type}`);
      }

      // Determine next if not set explicitly
      if (!nextNodeId && currentNode.type !== "condition") {
        nextNodeId = chooseFirstEdge(currentNode.id)?.target;
      }

      if (!nextNodeId) {
        // No outgoing path → stop gracefully
        await updateSession({
          status: "Completed",
          currentNodeId: null,
          context,
        });
        return;
      }

      const next = nodeById.get(nextNodeId);
      if (!next) {
        console.error(`Next node ${nextNodeId} not found`);
        await updateSession({ status: "Errored" });
        return;
      }

      // Persist context between steps
      await updateSession({ context });
      currentNode = next as FlowNode;
    }
  } catch (err) {
    console.error("Flow execution error:", err);
    await updateSession({ status: "Errored" });
  }
}
