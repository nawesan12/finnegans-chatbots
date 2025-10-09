import type {
  Prisma,
  User,
} from "@prisma/client";
import prisma from "@/lib/prisma";
import { executeFlow, FlowSendMessageError } from "@/lib/flow-executor";
import {
  MetaWebhookEvent,
  SessionWithRelations,
  WAContact,
  WAMessage,
  WAStatus,
  ManualFlowTriggerOptions,
  ManualFlowTriggerResult,
} from "@/lib/whatsapp/types";
import {
  BROADCAST_FAILURE_STATUSES,
  BROADCAST_SUCCESS_STATUSES,
  extractStatusError,
  extractUserText,
  findBestMatchingFlow,
  isWhatsappChannel,
  mapWhatsappStatus,
  normalizePhone,
  parseStatusTimestamp,
} from "@/lib/whatsapp/utils";
import { sendMessage } from "@/lib/whatsapp/client";
import { logger } from "@/lib/logger";

async function resolveUserForPhoneNumber(
  phoneNumberId: string,
): Promise<User | null> {
  const normalizedId = phoneNumberId.trim();
  if (!normalizedId) return null;
  return prisma.user.findFirst({
    where: { metaPhoneNumberId: normalizedId },
  });
}

async function adjustBroadcastAggregates(
  broadcastId: string,
  previousStatus?: string | null,
  nextStatus?: string | null,
) {
  if (!nextStatus || previousStatus === nextStatus) return;

  const prevSuccess = previousStatus ? BROADCAST_SUCCESS_STATUSES.has(previousStatus) : false;
  const nextSuccess = BROADCAST_SUCCESS_STATUSES.has(nextStatus);
  const prevFailure = previousStatus ? BROADCAST_FAILURE_STATUSES.has(previousStatus) : false;
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

    await adjustBroadcastAggregates(recipient.broadcastId, recipient.status, nextStatus);
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
  const userText = extractUserText(msg);
  if (!userText) {
    logger.info("Ignoring message (no text could be extracted)", {
      messageId: msg.id,
    });
    return;
  }

  const fromPhone = normalizePhone(msg.from);
  if (!fromPhone) {
    logger.error("Invalid 'from' phone number", { from: msg.from });
    return;
  }

  const contactProfile = contacts.find((c) => c.wa_id === fromPhone);
  const contactName = contactProfile?.profile?.name ?? null;

  const contact = await prisma.contact.upsert({
    where: { phone: fromPhone, userId: user.id },
    create: {
      phone: fromPhone,
      userId: user.id,
      name: contactName,
    },
    update: {
      ...(contactName && { name: contactName }),
    },
  });

  const existingSession = (await prisma.session.findFirst({
    where: {
      contactId: contact.id,
      status: { in: ["Active", "Paused"] },
    },
    include: { flow: true, contact: true },
  })) as SessionWithRelations | null;

  let session: SessionWithRelations | null = existingSession;
  let flow = session?.flow ?? null;

  if (!flow) {
    const availableFlows = await prisma.flow.findMany({
      where: { userId: user.id, status: "Active" },
    });
    const filteredFlows = availableFlows.filter((f) => isWhatsappChannel(f.channel));

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
    logger.warn("No active flow found for user to handle message", {
      userId: user.id,
      contactId: contact.id,
    });
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

  const interactiveType = msg.interactive?.type ?? null;
  const interactiveId =
    msg.interactive?.button_reply?.id || msg.interactive?.list_reply?.id || null;
  const interactiveTitle =
    msg.interactive?.button_reply?.title ||
    msg.interactive?.list_reply?.title ||
    null;

  const incomingMeta = {
    type: msg.type ?? (interactiveType ? "interactive" : "text"),
    rawText:
      msg.text?.body ??
      interactiveTitle ??
      (typeof msg.type === "string" && msg.type !== "text" ? userText : null) ??
      userText,
    interactive:
      interactiveType || interactiveId || interactiveTitle
        ? {
            type: interactiveType,
            id: interactiveId,
            title: interactiveTitle,
          }
        : null,
  } as const;

  try {
    await executeFlow(session, userText, sendMessageForUser, incomingMeta);
  } catch (err) {
    logger.error("Error executing flow for message", {
      messageId: msg.id,
      sessionId: session.id,
      error: err instanceof Error ? err.message : String(err),
    });
    if (session) {
      await prisma.session.update({
        where: { id: session.id },
        data: { status: "Errored" },
      });
    }
  }
}

// ===== Main Webhook Processor =====

export async function processWebhookEvent(data: MetaWebhookEvent) {
  if (data.object !== "whatsapp_business_account" || !data.entry?.length) {
    logger.warn("Invalid webhook event object or empty entries", {
      object: data.object,
      entryCount: data.entry?.length ?? 0,
    });
    return;
  }

  for (const entry of data.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const val = change?.value;
      const field = change?.field?.toLowerCase();

      if (field && field !== "messages") {
        continue;
      }

      const messagingProductRaw =
        val?.messaging_product ??
        (val as { messagingProduct?: string } | undefined)?.messagingProduct ??
        null;
      if (
        messagingProductRaw &&
        messagingProductRaw.trim().toLowerCase() !== "whatsapp"
      ) {
        logger.info("Skipping non-WhatsApp webhook payload", {
          messagingProduct: messagingProductRaw,
        });
        continue;
      }
      const phoneNumberId = val?.metadata?.phone_number_id;

      if (!phoneNumberId) continue;

      const user = await resolveUserForPhoneNumber(phoneNumberId);
      if (!user) {
        logger.error("User not found for phone number ID", { phoneNumberId });
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