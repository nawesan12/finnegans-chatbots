import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import {
  MessageDataSchema,
  TriggerDataSchema,
  EndDataSchema,
  DelayDataSchema,
} from "@/components/flow-builder/types";
import type { Node, Edge } from "reactflow";

const prisma = new PrismaClient();

// Infer types from Zod schemas
type TriggerData = z.infer<typeof TriggerDataSchema>;
type MessageData = z.infer<typeof MessageDataSchema>;
type DelayData = z.infer<typeof DelayDataSchema>;
type EndData = z.infer<typeof EndDataSchema>;

// Define a more specific Node type
// We should include all possible node data types here eventually
type FlowNode = Node<TriggerData | MessageData | DelayData | EndData>;

interface FlowData {
  nodes: FlowNode[];
  edges: Edge[];
}

export async function executeFlow(
  flowId: string,
  contactId: string,
  messageText: string,
  sendMessage: (userId: string, to: string, text: string) => Promise<void>
) {
  const flow = await prisma.flow.findUnique({
    where: { id: flowId },
  });

  const contact = await prisma.contact.findUnique({ where: { id: contactId } });

  if (!flow || !flow.definition) {
    console.error(`Flow with ID ${flowId} not found or has no definition.`);
    return;
  }

  if (!contact) {
    console.error(`Contact with ID ${contactId} not found.`);
    return;
  }

  await prisma.log.create({
    data: {
      flowId: flow.id,
      contactId: contact.id,
      status: "Started", // Or "Processing"
      context: {
        triggerMessage: messageText,
      },
    },
  });

  const flowData = flow.definition as unknown as FlowData;
  const { nodes, edges } = flowData;

  // 1. Find the trigger node that matches the incoming message.
  const triggerNode = nodes.find(
    (node) =>
      node.type === "trigger" &&
      (node.data as TriggerData).keyword.toLowerCase() === messageText.toLowerCase()
  );

  if (!triggerNode) {
    console.log(`No trigger found for keyword: "${messageText}" in flow ${flowId}`);
    return;
  }

  // 2. Start execution from the trigger node
  let currentNode: FlowNode | undefined = triggerNode;

  while (currentNode) {
    console.log(`Executing node ${currentNode.id} of type ${currentNode.type}`);

    switch (currentNode.type) {
      case "trigger":
        // No action, just an entry point
        break;
      case "message":
        const messageData = currentNode.data as MessageData;
        await sendMessage(contact.userId, contact.phone, messageData.text);
        break;
      case "delay":
        const delayData = currentNode.data as DelayData;
        await new Promise((resolve) =>
          setTimeout(resolve, delayData.seconds * 1000)
        );
        break;
      case "end":
        console.log("Flow execution ended.");
        await prisma.log.create({
            data: {
              flowId: flow.id,
              contactId: contact.id,
              status: "Finished",
              context: {},
            },
          });
        currentNode = undefined;
        continue;
      default:
        console.warn(`Node type "${currentNode.type}" not yet implemented.`);
    }

    // 3. Find the next node in the sequence
    const outgoingEdge = edges.find((edge) => edge.source === currentNode?.id);

    if (outgoingEdge) {
      const nextNodeId = outgoingEdge.target;
      currentNode = nodes.find((node) => node.id === nextNodeId);
      if (!currentNode) {
          console.error(`Next node with id ${nextNodeId} not found in flow ${flowId}.`);
      }
    } else {
      currentNode = undefined;
    }
  }
}
