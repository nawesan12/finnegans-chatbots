import type {
  Contact,
  Flow,
  Prisma,
  Session as PrismaSession,
  User,
} from "@prisma/client";
import prisma from "@/lib/prisma";
import { executeFlow, FlowSendMessageError } from "./flow-executor";

// ===== Constants =====
export const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v20.0";
export const META_API_TIMEOUT_MS = 15000;
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

// ===== Types =====

type SessionWithRelations = PrismaSession & {
  flow: Flow;
  contact: Contact;
};

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

interface WAMedia {
  id: string;
  mime_type?: string;
  sha256?: string;
  caption?: string;
}

type WAImage = WAMedia;
type WAVideo = WAMedia;
interface WAAudio extends WAMedia {
  voice?: boolean;
}
interface WADocument extends WAMedia {
  filename?: string;
}
type WASticker = WAMedia;

interface WAMessage {
  id: string;
  from: string;
  timestamp?: string;
  type?: WAMessageType;
  text?: { body?: string };
  interactive?: WAInteractive;
  image?: WAImage;
  video?: WAVideo;
  audio?: WAAudio;
  document?: WADocument;
  sticker?: WASticker;
}

interface WAStatusError {
  code?: number | string;
  title?: string;
  message?: string;
  error_data?: { details?: string };
}

interface WAStatus {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: WAStatusError[];
}

interface WAContactProfile {
  name?: string;
}

interface WAContact {
  wa_id?: string;
  profile?: WAContactProfile;
}

interface WAChangeValue {
  messages?: WAMessage[];
  statuses?: WAStatus[];
  metadata: {
    phone_number_id: string;
  };
  contacts?: WAContact[];
}

interface WAEntry {
  changes?: { value?: WAChangeValue }[];
}

export interface MetaWebhookEvent {
  object?: string;
  entry?: WAEntry[];
}

export type SendMessagePayload =
  | { type: "text"; text: string }
  | {
      type: "media";
      mediaType: "image" | "video" | "audio" | "document";
      id?: string;
      url?: string;
      caption?: string;
    }
  | { type: "options"; text: string; options: string[] }
  | {
      type: "list";
      text: string;
      button: string;
      sections: Array<{ title: string; rows: Array<{ id: string; title: string }> }>;
    }
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
  | { success: true; messageId?: string | null }
  | { success: false; error?: string; status?: number; details?: unknown };

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

// ===== Utility Functions =====
const toLcTrim = (s?: string) => (s ?? "").trim().toLowerCase();

const normalizePhone = (value?: string | null): string | null => {
  if (!value) return null;
  const digits = value.replace(/[^0-9]/g, "");
  return digits.length ? digits : null;
};

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
  if (channel === null || channel === undefined) return true;
  const trimmed = channel.trim();
  if (!trimmed) return true;
  return trimmed.toLowerCase() === "whatsapp";
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
  if (!flows.length) return null;

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

  for (const flow of flows) {
    const normalizedTrigger = normalizeTrigger(flow.trigger);
    const isDefaultTrigger = normalizedTrigger === "default";
    let matchesTrigger = false;

    if (normalizedTrigger && !isDefaultTrigger) {
      if (keywordCandidates.has(normalizedTrigger)) matchesTrigger = true;
      else if (normalizedText?.includes(normalizedTrigger)) matchesTrigger = true;
      else if (normalizedInteractiveTitle?.includes(normalizedTrigger))
        matchesTrigger = true;
      else if (normalizedInteractiveId === normalizedTrigger)
        matchesTrigger = true;
    }

    let score = 0;
    if (matchesTrigger) {
      score += 6;
      if (normalizedText === normalizedTrigger) score += 2;
      if (normalizedInteractiveTitle === normalizedTrigger) score += 1;
      if (normalizedInteractiveId === normalizedTrigger) score += 1;
    }
    if (!matchesTrigger && isDefaultTrigger) score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestFlow = flow;
    }
  }
  return bestFlow ?? flows[0] ?? null;
};

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
    default:
      return `[${msg.type ?? "unknown"}]`;
  }
}

function mapWhatsappStatus(rawStatus?: string | null): string | null {
  if (!rawStatus) return null;
  const normalized = rawStatus.trim().toLowerCase();
  return WHATSAPP_STATUS_MAP[normalized] ?? null;
}

function extractStatusError(errors?: WAStatusError[] | null): string | null {
  if (!errors?.length) return null;
  const [first] = errors;
  if (!first) return null;
  const details = first.error_data?.details;
  if (details) return details;
  return first.message || first.title || `Error code ${first.code}`;
}

function parseStatusTimestamp(timestamp?: string | null): Date | null {
  if (!timestamp) return null;
  const numeric = Number(timestamp);
  if (Number.isFinite(numeric)) return new Date(numeric * 1000);
  return null;
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

export async function sendMessage(
  userId: string,
  to: string,
  message: SendMessagePayload,
): Promise<SendMessageResult> {
  const normalizedTo = normalizePhone(to);
  if (!normalizedTo) {
    const error = "Invalid destination phone number";
    console.error(error, { to });
    return { success: false, status: 400, error };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { metaAccessToken: true, metaPhoneNumberId: true },
  });

  const accessToken = user?.metaAccessToken?.trim();
  const phoneNumberId = user?.metaPhoneNumberId?.trim();

  if (!accessToken || !phoneNumberId) {
    const error = "Missing Meta API credentials for user";
    console.error(error, { userId });
    return { success: false, error };
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  let body: Record<string, unknown> | undefined;

  switch (message.type) {
    case "text":
      body = { to: normalizedTo, type: "text", text: { body: message.text } };
      break;
    case "media":
      if (!message.id && !message.url) {
        return {
          success: false,
          status: 400,
          error: "Media message must have either an id or a url",
        };
      }
      const allowedMedia: Record<string, true> = {
        image: true,
        video: true,
        audio: true,
        document: true,
      };
      const mType = allowedMedia[message.mediaType]
        ? message.mediaType
        : "image";
      const mediaObject: { id?: string; link?: string; caption?: string } = {};
      if (message.id) {
        mediaObject.id = message.id;
      } else if (message.url) {
        mediaObject.link = message.url;
      }
      if (message.caption) {
        mediaObject.caption = message.caption;
      }
      body = {
        to: normalizedTo,
        type: mType,
        [mType]: mediaObject,
      };
      break;
    case "options":
      body = {
        to: normalizedTo,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: message.text },
          action: {
            buttons: message.options.slice(0, 3).map((opt) => ({
              type: "reply",
              reply: { id: toLcTrim(opt), title: opt },
            })),
          },
        },
      };
      break;
    case "list":
      body = {
        to: normalizedTo,
        type: "interactive",
        interactive: {
          type: "list",
          body: { text: message.text },
          action: {
            button: message.button,
            sections: message.sections,
          },
        },
      };
      break;
    case "flow": {
      const flowPayload = message.flow;
      const flowId = flowPayload?.id?.trim();
      const flowToken = flowPayload?.token?.trim();
      if (!flowId || !flowToken) {
        return {
          success: false,
          status: 400,
          error: "Missing WhatsApp Flow identifiers",
        };
      }

      const flowName = flowPayload?.name?.trim() || "whatsapp_flow";
      const flowVersion = flowPayload?.version?.trim();
      const header = flowPayload?.header?.trim();
      const footer = flowPayload?.footer?.trim();
      const bodyText = (flowPayload?.body ?? "").trim();
      const cta = flowPayload?.cta?.trim();

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
                    typeof parameter.text === "string" ? parameter.text : "";
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
        to: normalizedTo,
        type: "template",
        template: templatePayload,
      };
      break;
    }
  }

  if (!body) {
    return { success: false, error: "Unsupported message type" };
  }

  body.messaging_product = "whatsapp";

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), META_API_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });

    const json = (await res.json()) as unknown;
    if (!res.ok) {
      console.error("Error sending message:", json);
      return { success: false, status: res.status, details: json };
    }

    let messageId: string | null = null;
    if (
      typeof json === "object" &&
      json !== null &&
      "messages" in json &&
      Array.isArray((json as { messages?: unknown }).messages)
    ) {
      const messages = (json as {
        messages?: Array<{ id?: unknown }>;
      }).messages;

      const firstId = messages?.find(
        (message): message is { id: string } =>
          typeof message?.id === "string",
      )?.id;

      if (firstId) {
        messageId = firstId;
      }
    }

    return { success: true, messageId };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { success: false, error: "Request to Meta timed out" };
    }
    console.error("Failed to send message:", error);
    return { success: false, error: "Unknown error" };
  } finally {
    clearTimeout(t);
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
    where: { contactId: contact.id, status: { in: ["Active", "Paused"] } },
    include: { flow: true, contact: true },
  })) as SessionWithRelations | null;

  let session: SessionWithRelations | null = existingSession;
  let flow = session?.flow ?? null;

  if (!flow) {
    const availableFlows = await prisma.flow.findMany({
      where: { userId: user.id, status: "Active" },
    });
    const filteredFlows = availableFlows.filter((f) => isWhatsappChannel(f.channel));

    const interactiveTitle = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || null;
    const interactiveId = msg.interactive?.button_reply?.id || msg.interactive?.list_reply?.id || null;

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

// ===== Main Webhook Processor =====

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