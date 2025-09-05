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
) => Promise<void>;

// This function is now stateful and operates on a session
export async function executeFlow(
  session: Session & { flow: { definition: any; userId: string }; contact: { phone: string } },
  messageText: string,
  sendMessage: SendMessage,
) {
  const { nodes, edges } = session.flow.definition as FlowData;
  let context = (session.context as Record<string, any>) || {};
  let currentNode: FlowNode | undefined;

  // 1. Determine starting node
  if (session.currentNodeId && session.status === 'Paused') {
    const pausedNode = nodes.find((node) => node.id === session.currentNodeId);
    if (!pausedNode) {
      console.error(`Node ${session.currentNodeId} not found in flow ${session.flowId}`);
      await prisma.session.update({ where: { id: session.id }, data: { status: "Errored" } });
      return;
    }

    if (pausedNode.type === 'options') {
      // Resume from options node
      const userResponse = messageText;
      const optionsData = pausedNode.data as OptionsData;
      const optionIndex = optionsData.options.findIndex(
        (opt) => opt.toLowerCase() === userResponse.toLowerCase(),
      );

      let nextNodeId: string | undefined;
      if (optionIndex !== -1) {
        const sourceHandle = `opt-${optionIndex}`;
        const outgoingEdge = edges.find(
          (edge) => edge.source === pausedNode.id && edge.sourceHandle === sourceHandle,
        );
        nextNodeId = outgoingEdge?.target;
      } else {
        // No match logic
        const outgoingEdge = edges.find(
          (edge) => edge.source === pausedNode.id && edge.sourceHandle === "no-match",
        );
        nextNodeId = outgoingEdge?.target;
      }

      currentNode = nodes.find((node) => node.id === nextNodeId);
      if (nextNodeId && !currentNode) {
        console.error(`Next node with id ${nextNodeId} not found in flow ${session.flowId}.`);
        await prisma.session.update({ where: { id: session.id }, data: { status: "Errored" } });
        return;
      }
      await prisma.session.update({ where: { id: session.id }, data: { status: "Active" } });
    } else {
        currentNode = pausedNode;
    }
  } else {
    // New session, find trigger
    currentNode = nodes.find(
      (node) =>
        node.type === "trigger" &&
        (node.data as TriggerData).keyword.toLowerCase() === messageText.toLowerCase(),
    );
    if (currentNode) {
      context.triggerMessage = messageText;
    }
  }

  if (!currentNode) {
    console.log(`No trigger found for keyword: "${messageText}" in flow ${session.flowId}`);
    return; // Or maybe send a default "I don't understand" message
  }

  // 2. Main execution loop
  while (currentNode) {
    console.log(`Executing node ${currentNode.id} of type ${currentNode.type}`);
    await prisma.session.update({
      where: { id: session.id },
      data: { currentNodeId: currentNode.id, context },
    });

    let nextNodeId: string | undefined;

    switch (currentNode.type) {
      case "trigger":
        // Handled in entry logic
        break;
      case "message":
        const messageData = currentNode.data as MessageData;
        await sendMessage(session.flow.userId, session.contact.phone, {
          type: "text",
          text: messageData.text,
        });
        break;
      case "options":
        const optionsData = currentNode.data as OptionsData;
        await sendMessage(session.flow.userId, session.contact.phone, {
          type: "options",
          text: optionsData.text,
          options: optionsData.options,
        });
        // Pause execution and wait for user's next message
        await prisma.session.update({
          where: { id: session.id },
          data: { status: "Paused" },
        });
        return; // Stop execution
      case "delay":
        const delayData = currentNode.data as DelayData;
        await new Promise((resolve) => setTimeout(resolve, delayData.seconds * 1000));
        break;
      case "condition":
        // This is a simplified implementation. A real implementation would need a safe expression evaluator.
        // For now, we'll assume a simple variable check.
        const conditionData = currentNode.data as ConditionData;
        const expression = conditionData.expression; // e.g., "context.variable === 'value'"
        // DANGER: Using eval is not safe. This is a placeholder.
        let result = false;
        try {
          // A safer implementation would be to use a library like `jexl`
          const func = new Function('context', `return ${expression}`);
          result = func(context);
        } catch (e) {
          console.error("Error evaluating condition", e);
        }
        const sourceHandle = result ? "true" : "false";
        const outgoingEdge = edges.find(
          (edge) => edge.source === currentNode?.id && edge.sourceHandle === sourceHandle,
        );
        nextNodeId = outgoingEdge?.target;
        break;
      case "api":
        const apiData = currentNode.data as APICallData;
        try {
          const response = await fetch(apiData.url, {
            method: apiData.method,
            headers: apiData.headers,
            body: apiData.body,
          });
          const responseData = await response.json();
          context[apiData.assignTo] = responseData;
        } catch (e) {
          console.error("API call failed", e);
          context[apiData.assignTo] = { error: "API call failed" };
        }
        break;
      case "assign":
        const assignData = currentNode.data as AssignVarData;
        context[assignData.key] = assignData.value; // Simple assignment, could be more complex
        break;
      case "media":
        const mediaData = currentNode.data as MediaData;
        await sendMessage(session.flow.userId, session.contact.phone, {
          type: "media",
          mediaType: mediaData.mediaType,
          url: mediaData.url,
          caption: mediaData.caption,
        });
        break;
      case "handoff":
        console.log("Handoff initiated. Pausing flow.");
        await prisma.session.update({
          where: { id: session.id },
          data: { status: "Paused" },
        });
        return; // Stop execution
      case "goto":
        const gotoData = currentNode.data as GoToData;
        nextNodeId = gotoData.targetNodeId;
        break;
      case "end":
        console.log("Flow execution ended.");
        await prisma.session.update({
          where: { id: session.id },
          data: { status: "Completed", currentNodeId: null },
        });
        return; // Stop execution
      default:
        console.warn(`Node type "${currentNode.type}" not yet implemented.`);
    }

    // 3. Find the next node
    if (!nextNodeId) {
       if (currentNode.type !== "condition") {
        const outgoingEdge = edges.find((edge) => edge.source === currentNode?.id);
        nextNodeId = outgoingEdge?.target;
      }
    }

    currentNode = nodes.find((node) => node.id === nextNodeId);

    if (nextNodeId && !currentNode) {
      console.error(`Next node with id ${nextNodeId} not found in flow ${session.flowId}.`);
      await prisma.session.update({ where: { id: session.id }, data: { status: "Errored" } });
      return;
    }
  }
}
