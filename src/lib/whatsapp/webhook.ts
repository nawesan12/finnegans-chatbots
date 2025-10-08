import type {
  Prisma,
  User,
} from "@prisma/client";
import prisma from "@/lib/prisma";
import { executeFlow, FlowSendMessageError } from "../flow-executor";
import {
  findBestMatchingFlow,
  isWhatsappChannel,
  mapWhatsappStatus,
  extractStatusError,
  parseStatusTimestamp,
  normalizePhone,
} from "./utils";
import type {
  ManualFlowTriggerOptions,
  ManualFlowTriggerResult,
  MetaWebhookEvent,
  SessionWithRelations,
  WAContact,
  WAMessage,
  WAStatus,
} from "./types";
import { sendMessage } from "./api";

const BROADCAST_SUCCESS_STATUSES = new Set(["Sent", "Delivered", "Read"]);
const BROADCAST_FAILURE_STATUSES = new Set(["Failed"]);

async function resolveUserForPhoneNumber(
  phoneNumberId: string,
): Promise<User | null> {
  const normalizedId = phoneNumberId.trim();
  if (!normalizedId) return null;
  return prisma.user.findFirst({
    where: { metaPhoneNumberId: normalizedId },
  });
}

function extractUserText(msg: WAMessage): string | null {
  if (!msg) return null;
  switch (msg.type) {
    case "text":
      return msg.text?.body?.trim() || null;
    case "interactive":
      return (
        msg.interactive?.button_reply?.title ||
        msg.interactive?.list_reply?.title ||
        null
      );
    case "reaction":
      return msg.reaction?.emoji ?? null;
    default:
      return `[${msg.type ?? "unknown"}]`;
  }
}

async function adjustBroadcastAggregates(
  broadcastId: string,
  previousStatus?: string | null,
  nextStatus?: string | null,
) {
  if (!nextStatus || previousStatus === nextStatus) return;

  const prevSuccess = previousStatus
    ? BROADCAST_SUCCESS_STATUSES.has(previousStatus)
    : false;
  const nextSuccess = BROADCAST_SUCCESS_STATUSES.has(nextStatus);
  const prevFailure = previousStatus
    ? BROADCAST_FAILURE_STATUSES.has(previousStatus)
    : false;
  const nextFailure = BROADCAST_FAILURE_STATUSES.has(nextStatus);

  let successDelta = 0;
  if (nextSuccess && !prevSuccess) successDelta = 1;
  else if (!nextSuccess && prevSuccess) successDelta = -1;

  let failureDelta = 0;
  if (nextFailure && !prevFailure) failureDelta = 1;
  else if (!nextFailure && prevFailure) failureDelta = -1;

  if (successDelta !== 0 || failureDelta !== 0) {
    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: {
        successCount: { increment: successDelta },
        failureCount: { increment: failureDelta },
      },
    });
  }
}

async function processBroadcastStatuses(userId: string, statuses: WAStatus[]) {
  for (const status of statuses) {
    if (!status?.id) continue;
    const recipient = await prisma.broadcastRecipient.findFirst({
      where: { messageId: status.id, broadcast: { userId } },
    });
    if (!recipient) continue;

    const nextStatus = mapWhatsappStatus(status.status);
    if (!nextStatus) continue;

    const updateData: Prisma.BroadcastRecipientUpdateInput = {
      status: nextStatus,
      statusUpdatedAt: parseStatusTimestamp(status.timestamp) ?? new Date(),
    };
    if (BROADCAST_FAILURE_STATUSES.has(nextStatus)) {
      updateData.error = extractStatusError(status.errors) ?? "Delivery failed";
    }

    await prisma.broadcastRecipient.update({
      where: { id: recipient.id },
      data: updateData,
    });

    await adjustBroadcastAggregates(
      recipient.broadcastId,
      recipient.status,
      nextStatus,
    );
  }
}

export async function processManualFlowTrigger(
  options: ManualFlowTriggerOptions,
): Promise<ManualFlowTriggerResult> {
  const { flowId } = options;
  const rawPhone = options.from?.trim() ?? "";
  const normalizedPhone = normalizePhone(rawPhone);

  if (!normalizedPhone) {
    return {
      success: false,
      status: 400,
      error: rawPhone.length
        ? "Invalid contact phone number"
        : "Missing contact phone number",
    };
  }

  const flow = await prisma.flow.findUnique({
    where: { id: flowId },
    include: { user: true },
  });

  if (!flow) {
    return { success: false, status: 404, error: "Flow not found" };
  }

  if (!isWhatsappChannel(flow.channel ?? null)) {
    return {
      success: false,
      status: 409,
      error: "Flow is not configured for WhatsApp",
    };
  }

  if (flow.status !== "Active") {
    return { success: false, status: 409, error: "Flow is not active" };
  }

  const trimmedMessage = options.message?.trim();
  const candidateMessage =
    trimmedMessage && trimmedMessage.length > 0
      ? trimmedMessage
      : options.incomingMeta?.interactive?.title?.trim() ?? null;

  if (!candidateMessage) {
    return { success: false, status: 400, error: "Message text is required" };
  }

  let contact = await prisma.contact.findFirst({
    where: {
      userId: flow.userId,
      phone: normalizedPhone,
    },
  });

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        phone: normalizedPhone,
        userId: flow.userId,
        name: options.name,
      },
    });
  } else if (options.name && contact.name !== options.name) {
    contact = await prisma.contact.update({
      where: { id: contact.id },
      data: { name: options.name },
    });
  }

  let session = (await prisma.session.findUnique({
    where: { contactId_flowId: { contactId: contact.id, flowId: flow.id } },
    include: { flow: true, contact: true },
  })) as SessionWithRelations | null;

  if (!session) {
    session = (await prisma.session.create({
      data: { contactId: contact.id, flowId: flow.id, status: "Active" },
      include: { flow: true, contact: true },
    })) as SessionWithRelations;
  } else if (session.status === "Completed" || session.status === "Errored") {
    session = (await prisma.session.update({
      where: { id: session.id },
      data: { status: "Active", currentNodeId: null, context: {} },
      include: { flow: true, contact: true },
    })) as SessionWithRelations;
  }

  if (!session) {
    return {
      success: false,
      status: 500,
      error: "Unable to initialise session",
    };
  }

  const sendMessageForUser: Parameters<typeof executeFlow>[2] = (
    _userId,
    to,
    message,
  ) => sendMessage(flow.userId, to, message);

  try {
    await executeFlow(
      session,
      candidateMessage,
      sendMessageForUser,
      options.incomingMeta,
    );
    return {
      success: true,
      flowId: flow.id,
      contactId: contact.id,
      sessionId: session.id,
    };
  } catch (error) {
    const statusCode =
      error instanceof FlowSendMessageError ? error.status : 500;
    const errorMessage =
      error instanceof FlowSendMessageError
        ? error.message
        : "Failed to execute flow";
    return { success: false, status: statusCode, error: errorMessage };
  }
}

async function handleIncomingMessage(
  user: User,
  msg: WAMessage,
  contacts: WAContact[],
) {
  if (msg.type === "unsupported") {
    console.warn(
      `Ignoring unsupported message type from ${msg.from}. Message ID: ${msg.id}`,
    );
    return;
  }

  const userText = extractUserText(msg);
  if (!userText) {
    console.log(`Ignoring message ${msg.id} (no text could be extracted).`);
    return;
  }

  const fromPhone = normalizePhone(msg.from);
  if (!fromPhone) {
    console.error(`Invalid 'from' phone number: ${msg.from}`);
    return;
  }

  const contactProfile = contacts.find((c) => c.wa_id === fromPhone);
  const contactName = contactProfile?.profile?.name ?? null;

  const contact = await prisma.contact.upsert({
    where: { phone_userId: { phone: fromPhone, userId: user.id } },
    create: {
      phone: fromPhone,
      userId: user.id,
      name: contactName,
    },
    update: {
      ...(contactName && { name: contactName }),
    },
  });

  let session: SessionWithRelations | null = null;

  if (msg.type === "reaction" && msg.reaction?.message_id) {
    session = (await prisma.session.findFirst({
      where: {
        contactId: contact.id,
        status: { in: ["Active", "Paused"] },
        context: {
          path: ["lastOutboundMessageId"],
          equals: msg.reaction.message_id,
        },
      },
      include: { flow: true, contact: true },
    })) as SessionWithRelations | null;
  }

  if (!session) {
    session = (await prisma.session.findFirst({
      where: { contactId: contact.id, status: { in: ["Active", "Paused"] } },
      include: { flow: true, contact: true },
    })) as SessionWithRelations | null;
  }

  let flow = session?.flow ?? null;

  if (!flow) {
    const availableFlows = await prisma.flow.findMany({
      where: { userId: user.id, status: "Active" },
    });
    const filteredFlows = availableFlows.filter((f) =>
      isWhatsappChannel(f.channel),
    );

    const interactiveTitle =
      msg.interactive?.button_reply?.title ||
      msg.interactive?.list_reply?.title ||
      null;
    const interactiveId =
      msg.interactive?.button_reply?.id ||
      msg.interactive?.list_reply?.id ||
      null;

    flow = findBestMatchingFlow(filteredFlows, {
      fullText: userText,
      interactiveTitle,
      interactiveId,
    });
  }

  if (!flow) {
    console.error(`No active flow found for user ${user.id} to handle message.`);
    return;
  }

  if (!session || session.flowId !== flow.id) {
    session = (await prisma.session.findUnique({
      where: { contactId_flowId: { contactId: contact.id, flowId: flow.id } },
      include: { flow: true, contact: true },
    })) as SessionWithRelations | null;
  }

  if (!session) {
    session = (await prisma.session.create({
      data: { contactId: contact.id, flowId: flow.id, status: "Active" },
      include: { flow: true, contact: true },
    })) as SessionWithRelations;
  } else if (session.status === "Completed" || session.status === "Errored") {
    session = (await prisma.session.update({
      where: { id: session.id },
      data: { status: "Active", currentNodeId: null, context: {} },
      include: { flow: true, contact: true },
    })) as SessionWithRelations;
  }

  const sendMessageForUser: Parameters<typeof executeFlow>[2] = (
    _userId,
    to,
    message,
  ) => sendMessage(user.id, to, message);

  try {
    await executeFlow(session, userText, sendMessageForUser);
  } catch (err) {
    console.error(`Error executing flow for message ${msg.id}:`, err);
    if (session) {
      await prisma.session.update({
        where: { id: session.id },
        data: { status: "Errored" },
      });
    }
  }
}

export async function processWebhookEvent(data: MetaWebhookEvent) {
  if (data.object !== "whatsapp_business_account" || !data.entry?.length) {
    console.warn("Invalid webhook event object or empty entries.");
    return;
  }

  for (const entry of data.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const val = change?.value;
      const phoneNumberId = val?.metadata?.phone_number_id;

      if (!phoneNumberId) continue;

      const user = await resolveUserForPhoneNumber(phoneNumberId);
      if (!user) {
        console.error("User not found for phone number ID:", phoneNumberId);
        continue;
      }

      if (Array.isArray(val.statuses) && val.statuses.length) {
        await processBroadcastStatuses(user.id, val.statuses);
      }

      if (Array.isArray(val.messages) && val.messages.length) {
        for (const msg of val.messages) {
          await handleIncomingMessage(user, msg, val.contacts ?? []);
        }
      }
    }
  }
}