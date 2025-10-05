import type {
  Contact,
  Flow,
  Prisma,
  Session as PrismaSession,
} from "@prisma/client";

import prisma from "@/lib/prisma";
import { executeFlow, FlowSendMessageError } from "./flow-executor";

type SessionWithRelations = PrismaSession & {
  flow: Flow;
  contact: Contact;
};

/* ===== Tipos del webhook de Meta (simplificados y seguros) ===== */
type WAMessageType =
  | "text"
  | "interactive"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "sticker"
  | "unknown";

interface WAButtonReply {
  id: string;
  title: string;
}

interface WAListReply {
  id: string;
  title: string;
  description?: string;
}

interface WAInteractive {
  type: "button" | "list";
  button_reply?: WAButtonReply;
  list_reply?: WAListReply;
}

interface WAMessage {
  id: string;
  from: string;
  timestamp?: string;
  type?: WAMessageType;
  text?: { body?: string };
  interactive?: WAInteractive;
  // otros campos posibles (image, video, etc) omitidos
}

interface WAStatusError {
  code?: number | string;
  title?: string;
  message?: string;
  error_data?: { details?: string };
}

interface WAStatusConversation {
  id?: string;
  origin?: { type?: string };
}

interface WAStatus {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  conversation?: WAStatusConversation;
  pricing?: { billable?: boolean; pricing_model?: string };
  errors?: WAStatusError[];
}

interface WAContactProfile {
  name?: string;
}

interface WAContact {
  wa_id?: string;
  profile?: WAContactProfile;
  display_phone_number?: string;
  phone_number?: string;
  name?: string;
}

interface WAChangeValue {
  messages?: WAMessage[];
  statuses?: WAStatus[];
  metadata: {
    phone_number_id: string;
    display_phone_number?: string;
    wa_id?: string;
    whatsapp_business_account_id?: string;
  };
  contacts?: WAContact[];
  errors?: WAStatusError[];
}

interface WAEntry {
  changes?: { value?: WAChangeValue }[];
}

export interface MetaWebhookEvent {
  object?: string;
  entry?: WAEntry[];
}

export type ManualFlowTriggerOptions = {
  flowId: string;
  from: string;
  message: string;
  name?: string | null;
  variables?: Record<string, unknown> | null;
  incomingMeta?: {
    type?: string | null;
    rawText?: string | null;
    interactive?: {
      type?: string | null;
      id?: string | null;
      title?: string | null;
    } | null;
  } | null;
};

export type ManualFlowTriggerResult =
  | {
      success: true;
      flowId: string;
      contactId: string;
      sessionId: string;
    }
  | {
      success: false;
      error: string;
      status?: number;
    };

/* ===== Utilidades ===== */
const toLcTrim = (s?: string) => (s ?? "").trim().toLowerCase();

const DEFAULT_TRIGGER = "default";

const stripDiacritics = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const normalizeTrigger = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return stripDiacritics(trimmed).toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
};

const isWhatsappChannel = (channel?: string | null): boolean => {
  if (channel === null || channel === undefined) {
    return true;
  }
  const trimmed = channel.trim();
  if (!trimmed) {
    return true;
  }
  return trimmed.toLowerCase() === "whatsapp";
};

const normalizePhone = (value?: string | null): string | null => {
  if (!value) return null;
  const digits = value.replace(/[^0-9]/g, "");
  return digits.length ? digits : null;
};

type FlowMatchContext = {
  fullText: string | null;
  interactiveTitle: string | null;
  interactiveId: string | null;
};

const collectKeywordCandidates = (
  text: string | null,
  interactiveTitle: string | null,
  interactiveId: string | null,
) => {
  const candidates = new Set<string>();
  const push = (value: string | null) => {
    const normalized = normalizeTrigger(value);
    if (!normalized) return;
    candidates.add(normalized);
    for (const part of normalized.split(/\s+/u)) {
      if (part) candidates.add(part);
    }
  };

  push(text);
  push(interactiveTitle);
  push(interactiveId);

  return candidates;
};

const findBestMatchingFlow = (flows: Flow[], context: FlowMatchContext) => {
  if (!flows.length) {
    return null;
  }

  const keywordCandidates = collectKeywordCandidates(
    context.fullText,
    context.interactiveTitle,
    context.interactiveId,
  );
  const normalizedText = normalizeTrigger(context.fullText);
  const normalizedInteractiveTitle = normalizeTrigger(context.interactiveTitle);
  const normalizedInteractiveId = normalizeTrigger(context.interactiveId);

  let bestFlow: Flow | null = null;
  let bestScore = -1;
  let bestUpdatedAt = 0;

  for (const flow of flows) {
    const normalizedTrigger = normalizeTrigger(flow.trigger);
    const isDefaultTrigger = normalizedTrigger === DEFAULT_TRIGGER;

    let matchesTrigger = false;
    if (normalizedTrigger && !isDefaultTrigger) {
      if (keywordCandidates.has(normalizedTrigger)) {
        matchesTrigger = true;
      } else if (normalizedText && normalizedText.includes(normalizedTrigger)) {
        matchesTrigger = true;
      } else if (
        normalizedInteractiveTitle &&
        normalizedInteractiveTitle.includes(normalizedTrigger)
      ) {
        matchesTrigger = true;
      } else if (
        normalizedInteractiveId &&
        normalizedInteractiveId === normalizedTrigger
      ) {
        matchesTrigger = true;
      }
    }

    let score = 0;
    if (matchesTrigger) {
      score += 6;
      if (normalizedTrigger && normalizedText === normalizedTrigger) {
        score += 2;
      }
      if (
        normalizedTrigger &&
        normalizedInteractiveTitle === normalizedTrigger
      ) {
        score += 1;
      }
      if (normalizedTrigger && normalizedInteractiveId === normalizedTrigger) {
        score += 1;
      }
    }
    if (!matchesTrigger && isDefaultTrigger) score += 1;

    if (score <= 0) {
      continue;
    }

    const updatedAt =
      flow.updatedAt instanceof Date
        ? flow.updatedAt.getTime()
        : new Date(flow.updatedAt).getTime();

    if (
      score > bestScore ||
      (score === bestScore && updatedAt > bestUpdatedAt)
    ) {
      bestScore = score;
      bestFlow = flow;
      bestUpdatedAt = updatedAt;
    }
  }

  if (bestFlow) {
    return bestFlow;
  }

  return flows[0] ?? null;
};

const BROADCAST_SUCCESS_STATUSES = new Set(["Sent", "Delivered", "Read"]);
const BROADCAST_FAILURE_STATUSES = new Set(["Failed"]);

const WHATSAPP_STATUS_MAP: Record<string, string> = {
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Failed",
  undelivered: "Failed",
  deleted: "Failed",
  warning: "Warning",
  pending: "Pending",
  queued: "Pending",
};

type ContactIndexEntry = { name: string | null };

function mapWhatsappStatus(rawStatus?: string | null): string | null {
  if (!rawStatus) return null;
  const normalized = rawStatus.trim().toLowerCase();
  const mapped = WHATSAPP_STATUS_MAP[normalized];
  if (mapped) return mapped;
  const capitalized = rawStatus.trim();
  if (!capitalized) return null;
  return capitalized.charAt(0).toUpperCase() + capitalized.slice(1);
}

function extractStatusError(errors?: WAStatusError[] | null): string | null {
  if (!errors?.length) return null;
  const [first] = errors;
  if (!first) return null;

  const details =
    typeof first.error_data === "object" && first.error_data
      ? (first.error_data as { details?: string }).details
      : undefined;
  if (typeof details === "string" && details.trim()) {
    return details.trim();
  }

  if (typeof first.message === "string" && first.message.trim()) {
    return first.message.trim();
  }

  if (typeof first.title === "string" && first.title.trim()) {
    return first.title.trim();
  }

  if (typeof first.code === "string" || typeof first.code === "number") {
    return `Error code ${String(first.code)}`;
  }

  return null;
}

function parseStatusTimestamp(timestamp?: string | null): Date | null {
  if (!timestamp) return null;
  const numeric = Number(timestamp);
  if (Number.isFinite(numeric) && numeric > 0) {
    // WhatsApp timestamps are seconds
    return new Date(numeric * 1000);
  }
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function adjustBroadcastAggregates(
  broadcastId: string,
  previousStatus?: string | null,
  nextStatus?: string | null,
) {
  if (!nextStatus || previousStatus === nextStatus) {
    return;
  }

  const prevSuccess = previousStatus
    ? BROADCAST_SUCCESS_STATUSES.has(previousStatus)
    : false;
  const nextSuccess = BROADCAST_SUCCESS_STATUSES.has(nextStatus);
  const prevFailure = previousStatus
    ? BROADCAST_FAILURE_STATUSES.has(previousStatus)
    : false;
  const nextFailure = BROADCAST_FAILURE_STATUSES.has(nextStatus);

  let successDelta = 0;
  let failureDelta = 0;

  if (nextSuccess && !prevSuccess) {
    successDelta += 1;
  } else if (!nextSuccess && prevSuccess) {
    successDelta -= 1;
  }

  if (nextFailure && !prevFailure) {
    failureDelta += 1;
  } else if (!nextFailure && prevFailure) {
    failureDelta -= 1;
  }

  if (!successDelta && !failureDelta) {
    return;
  }

  const data: Prisma.BroadcastUpdateInput = {};

  if (successDelta > 0) {
    data.successCount = { increment: successDelta };
  } else if (successDelta < 0) {
    data.successCount = { decrement: Math.abs(successDelta) };
  }

  if (failureDelta > 0) {
    data.failureCount = { increment: failureDelta };
  } else if (failureDelta < 0) {
    data.failureCount = { decrement: Math.abs(failureDelta) };
  }

  try {
    await prisma.broadcast.update({ where: { id: broadcastId }, data });
  } catch (error) {
    console.error("Failed to update broadcast aggregates:", error);
  }
}

function indexWhatsappContacts(
  contacts?: WAContact[] | null,
): Map<string, ContactIndexEntry> {
  const map = new Map<string, ContactIndexEntry>();
  if (!Array.isArray(contacts)) {
    return map;
  }

  for (const contact of contacts) {
    const waId = typeof contact?.wa_id === "string" ? contact.wa_id.trim() : "";
    if (!waId) continue;

    const profileName =
      typeof contact?.profile?.name === "string"
        ? contact.profile.name.trim()
        : undefined;
    const fallbackName =
      typeof contact?.name === "string" ? contact.name.trim() : undefined;
    const name =
      profileName && profileName.length > 0
        ? profileName
        : fallbackName && fallbackName.length > 0
          ? fallbackName
          : null;

    map.set(waId, { name });
  }

  return map;
}

async function resolveUserForPhoneNumber(phoneNumberId: string) {
  const normalizedId = phoneNumberId.trim();

  if (!normalizedId) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: { metaPhoneNumberId: normalizedId },
  });

  return user ?? null;
}

const LOG_STATUS_MAP: Record<string, string> = {
  Active: "In Progress",
  Paused: "In Progress",
  Completed: "Completed",
  Errored: "Error",
};

async function recordSessionSnapshot(sessionId: string) {
  const sessionSnapshot = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      context: true,
      contactId: true,
      flowId: true,
    },
  });

  if (!sessionSnapshot) {
    return;
  }

  const logStatus =
    LOG_STATUS_MAP[sessionSnapshot.status] ??
    sessionSnapshot.status ??
    "In Progress";

  try {
    await prisma.log.create({
      data: {
        status: logStatus,
        context: sessionSnapshot.context ?? {},
        contactId: sessionSnapshot.contactId,
        flowId: sessionSnapshot.flowId,
      },
    });
  } catch (error) {
    console.error("Failed to persist session snapshot:", error);
  }
}

async function processBroadcastStatuses(userId: string, statuses: WAStatus[]) {
  for (const status of statuses) {
    if (!status) continue;

    const messageId =
      typeof status.id === "string" && status.id.trim().length > 0
        ? status.id.trim()
        : null;

    if (!messageId) continue;

    try {
      const recipient = await prisma.broadcastRecipient.findFirst({
        where: {
          messageId,
          broadcast: { userId },
        },
        select: { id: true, status: true, broadcastId: true },
      });

      if (!recipient) {
        continue;
      }

      const nextStatus = mapWhatsappStatus(status.status ?? null);
      const statusTimestamp = parseStatusTimestamp(status.timestamp ?? null);
      const conversationId =
        typeof status.conversation?.id === "string" &&
        status.conversation.id.trim().length > 0
          ? status.conversation.id.trim()
          : null;

      const updateData: Prisma.BroadcastRecipientUpdateInput = {
        statusUpdatedAt: statusTimestamp ?? new Date(),
      };

      if (nextStatus) {
        updateData.status = nextStatus;
        if (!BROADCAST_FAILURE_STATUSES.has(nextStatus)) {
          updateData.error = null;
        }
      }

      if (conversationId) {
        updateData.conversationId = conversationId;
      }

      if (BROADCAST_FAILURE_STATUSES.has(nextStatus ?? "")) {
        const errorMessage =
          extractStatusError(status.errors ?? null) ??
          "Meta reported delivery failure";
        updateData.error = errorMessage;
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
    } catch (error) {
      console.error(
        "Failed to process broadcast status update for message:",
        messageId,
        error,
      );
    }
  }
}

/** Extrae un texto “humano” del mensaje (texto o título de botón/lista). */
function extractUserText(msg: WAMessage): string | null {
  if (!msg) return null;
  if (msg.type === "text" && msg.text?.body) return msg.text.body;
  if (msg.type === "interactive" && msg.interactive) {
    if (msg.interactive.button_reply?.title)
      return msg.interactive.button_reply.title;
    if (msg.interactive.list_reply?.title)
      return msg.interactive.list_reply.title;
  }
  // si fuera un media sin caption, devolvemos id para no romper
  return msg.text?.body ?? null;
}

/* ====== Procesador de Webhook ====== */
export async function processWebhookEvent(data: MetaWebhookEvent) {
  // sanity checks
  if (data.object !== "whatsapp_business_account" || !data.entry?.length)
    return;

  for (const entry of data.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const val = change?.value;
      const phoneNumberId = val?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      // Resolvemos el “owner” del número
      const user = await resolveUserForPhoneNumber(phoneNumberId);
      if (!user) {
        console.error("User not found for phone number ID:", phoneNumberId);
        continue;
      }

      const statuses = Array.isArray(val?.statuses) ? val.statuses : [];
      if (statuses.length) {
        await processBroadcastStatuses(user.id, statuses);
      }

      const messages = Array.isArray(val?.messages) ? val.messages : [];
      if (!messages.length) continue;

      const contactIndex = indexWhatsappContacts(val?.contacts);

      // Procesamos cada mensaje (Meta puede agruparlos)
      for (const msg of messages) {
        // ignorar si no es un mensaje entendible
        const textRaw = extractUserText(msg);
        if (!textRaw) continue;

        const from = msg.from;
        const text = textRaw; // no transformamos acá (executeFlow ya hace matching robusto)

        const contactProfile = contactIndex.get(from);
        const contactName = contactProfile?.name ?? null;

        // Contacto: upsert seguro para ese usuario
        let contact = await prisma.contact.findFirst({
          where: { phone: from, userId: user.id },
        });
        if (!contact) {
          contact = await prisma.contact.create({
            data: {
              phone: from,
              userId: user.id,
              ...(contactName ? { name: contactName } : {}),
            },
          });
        } else if (contactName) {
          const existingName = contact.name?.trim();
          if (existingName !== contactName) {
            try {
              contact = await prisma.contact.update({
                where: { id: contact.id },
                data: { name: contactName },
              });
            } catch (error) {
              console.error("Failed to update contact name for", from, error);
            }
          }
        }

        const existingSession = (await prisma.session.findFirst({
          where: {
            contactId: contact.id,
            status: { in: ["Active", "Paused"] },
          },
          include: { flow: true, contact: true },
          orderBy: { updatedAt: "desc" },
        })) as SessionWithRelations | null;

        let session: SessionWithRelations | null =
          existingSession &&
          isWhatsappChannel(existingSession.flow?.channel ?? null)
            ? existingSession
            : null;

        let flow = session?.flow ?? null;

        if (!flow) {
          const availableFlowsRaw = await prisma.flow.findMany({
            where: { userId: user.id, status: "Active" },
            orderBy: { updatedAt: "desc" },
          });
          const availableFlows = availableFlowsRaw.filter((candidate) =>
            isWhatsappChannel(candidate.channel ?? null),
          );

          const interactiveTitle =
            msg.interactive?.button_reply?.title ??
            msg.interactive?.list_reply?.title ??
            null;
          const interactiveId =
            msg.interactive?.button_reply?.id ??
            msg.interactive?.list_reply?.id ??
            null;

          flow = findBestMatchingFlow(availableFlows, {
            fullText: text,
            interactiveTitle,
            interactiveId,
          });
        }

        if (!flow) {
          console.error("No flow available for user:", user.id);
          continue;
        }

        if (!session || session.flowId !== flow.id) {
          session = (await prisma.session.findUnique({
            where: {
              contactId_flowId: { contactId: contact.id, flowId: flow.id },
            },
            include: { flow: true, contact: true },
          })) as SessionWithRelations | null;
        }

        if (!session) {
          session = (await prisma.session.create({
            data: { contactId: contact.id, flowId: flow.id, status: "Active" },
            include: { flow: true, contact: true },
          })) as SessionWithRelations;
        } else if (
          session.status === "Completed" ||
          session.status === "Errored"
        ) {
          session = (await prisma.session.update({
            where: { id: session.id },
            data: { status: "Active", currentNodeId: null, context: {} },
            include: { flow: true, contact: true },
          })) as SessionWithRelations;
        } else if (!session.flow || !session.contact) {
          session = (await prisma.session.findUnique({
            where: { id: session.id },
            include: { flow: true, contact: true },
          })) as SessionWithRelations | null;
        }

        try {
          const incomingMeta = {
            type: msg.type ?? null,
            rawText: msg.text?.body ?? textRaw ?? null,
            interactive: msg.interactive
              ? {
                  type: msg.interactive.type ?? null,
                  id:
                    msg.interactive.button_reply?.id ??
                    msg.interactive.list_reply?.id ??
                    null,
                  title:
                    msg.interactive.button_reply?.title ??
                    msg.interactive.list_reply?.title ??
                    null,
                }
              : null,
          };

          if (!session) {
            console.error(
              "Session could not be resolved for contact",
              contact.id,
            );
            continue;
          }

          await executeFlow(
            session,
            text, //@ts-expect-error bla
            (uid, to, payload) => sendMessage(uid, to, payload),
            incomingMeta,
          );
        } catch (err) {
          console.error("executeFlow error:", err);
          if (session) {
            await prisma.session.update({
              where: { id: session.id },
              data: { status: "Errored" },
            });
          }
        } finally {
          if (session) {
            await recordSessionSnapshot(session.id);
          }
        }
      }
    }
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
      : (options.incomingMeta?.interactive?.title?.trim() ?? null);

  if (!candidateMessage) {
    return { success: false, status: 400, error: "Message text is required" };
  }

  const lookupPhones = [normalizedPhone];
  if (rawPhone && rawPhone !== normalizedPhone) {
    lookupPhones.push(rawPhone);
  }

  let contact = await prisma.contact.findFirst({
    where: {
      userId: flow.userId,
      OR: lookupPhones.map((value) => ({ phone: value })),
    },
  });

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        phone: normalizedPhone,
        userId: flow.userId,
        ...(options.name ? { name: options.name } : {}),
      },
    });
  } else {
    if (contact.phone !== normalizedPhone) {
      try {
        contact = await prisma.contact.update({
          where: { id: contact.id },
          data: { phone: normalizedPhone },
        });
      } catch (error) {
        console.error("Failed to normalize contact phone", contact.id, error);
      }
    }

    if (options.name) {
      const currentName = contact.name?.trim();
      if (currentName !== options.name) {
        try {
          contact = await prisma.contact.update({
            where: { id: contact.id },
            data: { name: options.name },
          });
        } catch (error) {
          console.error("Failed to update contact name", contact.id, error);
        }
      }
    }
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
  } else if (!session.flow || !session.contact) {
    session = (await prisma.session.findUnique({
      where: { id: session.id },
      include: { flow: true, contact: true },
    })) as SessionWithRelations | null;
  }

  if (!session) {
    return {
      success: false,
      status: 500,
      error: "Unable to initialise session",
    };
  }

  const variables = options.variables;
  if (variables && Object.keys(variables).length > 0) {
    const currentContext =
      (session.context as Record<string, unknown> | null) ?? {};
    const nextContext = {
      ...currentContext,
      ...variables,
    } as Prisma.JsonObject;
    session = (await prisma.session.update({
      where: { id: session.id },
      data: { context: nextContext },
      include: { flow: true, contact: true },
    })) as SessionWithRelations;
  }

  const incomingMeta = options.incomingMeta ?? {
    type: "text",
    rawText: candidateMessage,
    interactive: null,
  };

  try {
    await executeFlow(
      session,
      candidateMessage, //@ts-expect-error bla
      (uid, to, payload) => sendMessage(uid, to, payload),
      incomingMeta,
    );

    return {
      success: true,
      flowId: flow.id,
      contactId: contact.id,
      sessionId: session.id,
    };
  } catch (error) {
    console.error("Manual flow trigger execution failed:", error);
    try {
      await prisma.session.update({
        where: { id: session.id },
        data: { status: "Errored" },
      });
    } catch (updateError) {
      console.error("Failed to mark session as errored:", updateError);
    }
    const statusCode =
      error instanceof FlowSendMessageError && error.status
        ? error.status
        : 500;
    const errorMessage =
      error instanceof FlowSendMessageError && error.message
        ? error.message
        : "Failed to execute flow";
    return { success: false, status: statusCode, error: errorMessage };
  } finally {
    try {
      await recordSessionSnapshot(session.id);
    } catch (snapshotError) {
      console.error("Failed to record manual session snapshot:", snapshotError);
    }
  }
}

/* ===== Envío de mensajes a WhatsApp (Graph API) ===== */
type SendMessagePayload =
  | { type: "text"; text: string }
  | {
      type: "media";
      mediaType: "image" | "video" | "audio" | "document";
      url: string;
      caption?: string;
    }
  | { type: "options"; text: string; options: string[] }
  | {
      type: "flow";
      flow: {
        name?: string | null;
        id: string;
        token: string;
        version?: string | null;
        header?: string | null;
        body: string;
        footer?: string | null;
        cta?: string | null;
      };
    }
  | {
      type: "template";
      template: {
        name: string;
        language: string;
        components?: Array<{
          type: string;
          subType?: string | null;
          index?: number | null;
          parameters?: Array<{ type: "text"; text: string }>;
        }>;
      };
    };

export type SendMessageResult =
  | { success: true; messageId?: string | null; conversationId?: string | null }
  | {
      success: false;
      error?: string;
      status?: number;
      details?: unknown;
    };

export const GRAPH_VERSION = "v22.0";
export const META_API_TIMEOUT_MS = 15000;

export async function sendMessage(
  userId: string,
  to: string,
  message: SendMessagePayload,
): Promise<SendMessageResult> {
  const normalizedTo = normalizePhone(to);

  if (!normalizedTo) {
    const errorMessage = "Invalid destination phone number";
    console.error(errorMessage, "for user:", userId, "value:", to);
    return { success: false, status: 400, error: errorMessage };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { metaAccessToken: true, metaPhoneNumberId: true },
  });

  const accessToken = user?.metaAccessToken?.trim() ?? null;
  const phoneNumberId = user?.metaPhoneNumberId?.trim() ?? null;

  if (!accessToken || !phoneNumberId) {
    const errorMessage = "Missing Meta API credentials";
    console.error(errorMessage, "for user:", userId);
    return { success: false, error: errorMessage };
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  // Construcción del cuerpo según tipo
  let body: Record<string, unknown> | undefined;
  switch (message.type) {
    case "text":
      body = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizedTo,
        type: "text",
        text: { body: message.text, preview_url: false },
      };
      break;

    case "media": {
      const allowed: Record<string, true> = {
        image: true,
        video: true,
        audio: true,
        document: true,
      };
      const mType = allowed[message.mediaType] ? message.mediaType : "image";
      body = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizedTo,
        type: mType,
        [mType]: {
          link: message.url,
          ...(message.caption ? { caption: message.caption } : {}),
        },
      };
      break;
    }

    case "options": {
      // WhatsApp limita a 3 botones. Recortamos si es necesario.
      const opts = (message.options || []).slice(0, 3);
      body = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizedTo,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: message.text },
          action: {
            buttons: opts.map((opt) => ({
              type: "reply",
              reply: {
                id: toLcTrim(opt).replace(/\s+/g, "_") || "opt",
                title: opt,
              },
            })),
          },
        },
      };
      break;
    }

    case "flow": {
      const flow = message.flow;
      const flowId = flow?.id?.trim();
      const flowToken = flow?.token?.trim();
      if (!flowId || !flowToken) {
        return {
          success: false,
          status: 400,
          error: "Missing WhatsApp Flow identifiers",
        };
      }

      const flowName = flow?.name?.trim() || "whatsapp_flow";
      const flowVersion = flow?.version?.trim();
      const header = flow?.header?.trim();
      const footer = flow?.footer?.trim();
      const bodyText = (flow?.body ?? "").trim();
      const cta = flow?.cta?.trim();

      const interactive: Record<string, unknown> = {
        type: "flow",
        flow: {
          name: flowName,
          id: flowId,
          token: flowToken,
          ...(flowVersion ? { version: flowVersion } : {}),
        },
      };

      if (header) {
        interactive.header = { type: "text", text: header };
      }
      if (bodyText) {
        interactive.body = { text: bodyText };
      }
      if (footer) {
        interactive.footer = { text: footer };
      }
      if (cta) {
        (interactive.flow as Record<string, unknown>).flow_cta = cta;
      }

      body = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizedTo,
        type: "interactive",
        interactive,
      };
      break;
    }

    case "template": {
      const template = message.template;
      const templateName = template?.name?.trim();
      const templateLanguage = template?.language?.trim();
      if (!templateName || !templateLanguage) {
        return {
          success: false,
          status: 400,
          error: "Missing template name or language",
        };
      }

      const components = Array.isArray(template?.components)
        ? template.components
        : [];

      const normalizedComponents = components
        .map((component) => {
          const type = (component?.type ?? "").toString().trim().toLowerCase();
          if (!type) return null;

          const normalized: Record<string, unknown> = { type };

          const subType = (component?.subType ?? "")?.toString().trim();
          if (subType) {
            normalized.sub_type = subType.toLowerCase();
          }

          if (
            typeof component?.index === "number" &&
            Number.isFinite(component.index)
          ) {
            normalized.index = component.index;
          }

          const parameters = Array.isArray(component?.parameters)
            ? component.parameters
                .map((parameter) => {
                  if (!parameter || parameter.type !== "text") return null;
                  const textValue =
                    typeof parameter.text === "string"
                      ? parameter.text
                      : "";
                  return { type: "text", text: textValue };
                })
                .filter((entry): entry is { type: "text"; text: string } =>
                  entry !== null,
                )
            : [];

          if (parameters.length) {
            normalized.parameters = parameters;
          }

          return normalized;
        })
        .filter((component): component is Record<string, unknown> =>
          component !== null,
        );

      const templatePayload: Record<string, unknown> = {
        name: templateName,
        language: { code: templateLanguage },
      };

      if (normalizedComponents.length) {
        templatePayload.components = normalizedComponents;
      }

      body = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizedTo,
        type: "template",
        template: templatePayload,
      };
      break;
    }
  }

  // Llamada con timeout/abort
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), META_API_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body ?? {}),
      signal: ctrl.signal,
    });

    const raw = await res.text().catch(() => "");
    let json: unknown;

    if (raw) {
      try {
        json = JSON.parse(raw);
      } catch {
        json = undefined;
      }
    }

    if (!res.ok) {
      const errorPayload = json as
        | { error?: { message?: string; error_user_msg?: string } }
        | undefined;
      const graphMessage =
        errorPayload?.error?.error_user_msg ?? errorPayload?.error?.message;
      const fallback = raw || res.statusText || "Meta API request failed";
      const errorMessage = graphMessage?.trim().length
        ? graphMessage
        : fallback;

      const lowerMessage = errorMessage?.toLowerCase() ?? "";
      const isAccessTokenError =
        res.status === 401 ||
        ((res.status === 400 || res.status === 403) &&
          (lowerMessage.includes("access token") ||
            lowerMessage.includes("session has expired")));

      const normalizedError = isAccessTokenError
        ? "Meta access token expired. Please reconnect WhatsApp in Settings."
        : errorMessage;

      console.error("Error sending message:", res.status, errorMessage);
      return {
        success: false,
        status: res.status,
        error: normalizedError,
        details: json,
      };
    }

    const response = json as
      | {
          messages?: Array<{ id?: string }>;
          contacts?: Array<{ wa_id?: string }>;
        }
      | undefined;
    const messageId =
      response?.messages?.find((m) => typeof m?.id === "string")?.id ?? null;

    return { success: true, messageId };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("Error sending message: request timeout");
      return { success: false, error: "Request to Meta timed out" };
    }
    console.error("Error sending message:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error while sending message",
    };
  } finally {
    clearTimeout(t);
  }
}
