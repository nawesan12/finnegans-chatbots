import type { Contact, Flow, Session as PrismaSession } from "@prisma/client";

import prisma from "@/lib/prisma";
import { executeFlow } from "./flow-executor";

export type MetaEnvironmentConfig = {
  verifyToken: string | null;
  appSecret: string | null;
  accessToken: string | null;
  phoneNumberId: string | null;
  businessAccountId: string | null;
};

export function getMetaEnvironmentConfig(): MetaEnvironmentConfig {
  return {
    verifyToken:
      process.env.META_VERIFY_TOKEN ?? process.env.WHATSAPP_VERIFY_TOKEN ?? null,
    appSecret:
      process.env.META_APP_SECRET ??
      process.env.WHATSAPP_APP_SECRET ??
      null,
    accessToken:
      process.env.META_ACCESS_TOKEN ??
      process.env.WHATSAPP_KEY ??
      null,
    phoneNumberId:
      process.env.META_PHONE_NUMBER_ID ??
      process.env.WHATSAPP_NUMBER_ID ??
      null,
    businessAccountId:
      process.env.META_BUSINESS_ACCOUNT_ID ??
      process.env.ACCOUNT_NUMBER_ID ??
      null,
  };
}

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

interface WAStatus {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  conversation?: Record<string, unknown>;
  pricing?: Record<string, unknown>;
  errors?: Array<Record<string, unknown>>;
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
  contacts?: Array<Record<string, unknown>>;
  errors?: Array<Record<string, unknown>>;
}

interface WAEntry {
  changes: { value: WAChangeValue }[];
}

export interface MetaWebhookEvent {
  object?: string;
  entry?: WAEntry[];
}

/* ===== Utilidades ===== */
const toLcTrim = (s?: string) => (s ?? "").trim().toLowerCase();

async function resolveUserForPhoneNumber(phoneNumberId: string) {
  const user = await prisma.user.findFirst({
    where: { metaPhoneNumberId: phoneNumberId },
  });

  if (user) {
    return user;
  }

  const envConfig = getMetaEnvironmentConfig();

  if (
    envConfig.phoneNumberId &&
    toLcTrim(envConfig.phoneNumberId) === toLcTrim(phoneNumberId)
  ) {
    const fallbackUser = await prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (fallbackUser) {
      console.warn(
        "Falling back to the first user for phone number ID", 
        phoneNumberId,
        "based on environment configuration.",
      );
      return fallbackUser;
    }
  }

  return null;
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
    LOG_STATUS_MAP[sessionSnapshot.status] ?? sessionSnapshot.status ?? "In Progress";

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

  for (const entry of data.entry) {
    for (const change of entry.changes) {
      const val = change.value;
      const phoneNumberId = val?.metadata?.phone_number_id;
      const messages = val?.messages || [];
      if (!phoneNumberId || !messages.length) continue;

      // Resolvemos el “owner” del número
      const user = await resolveUserForPhoneNumber(phoneNumberId);
      if (!user) {
        console.error("User not found for phone number ID:", phoneNumberId);
        continue;
      }

      // Procesamos cada mensaje (Meta puede agruparlos)
      for (const msg of messages) {
        // ignorar si no es un mensaje entendible
        const textRaw = extractUserText(msg);
        if (!textRaw) continue;

        const from = msg.from;
        const text = textRaw; // no transformamos acá (executeFlow ya hace matching robusto)

        // Contacto: upsert seguro para ese usuario
        let contact = await prisma.contact.findFirst({
          where: { phone: from, userId: user.id },
        });
        if (!contact) {
          contact = await prisma.contact.create({
            data: { phone: from, userId: user.id },
          });
        }

        const existingSession =
          (await prisma.session.findFirst({
            where: {
              contactId: contact.id,
              status: { in: ["Active", "Paused"] },
            },
            include: { flow: true, contact: true },
            orderBy: { updatedAt: "desc" },
          })) as SessionWithRelations | null;

        let flow = existingSession?.flow ?? null;

        if (!flow) {
          flow = await prisma.flow.findFirst({
            where: { userId: user.id, status: "Active" },
            orderBy: { updatedAt: "desc" },
          });
        }

        if (!flow) {
          console.error("No flow available for user:", user.id);
          continue;
        }

        let session: SessionWithRelations | null = existingSession;

        if (!session || session.flowId !== flow.id) {
          session =
            (await prisma.session.findUnique({
              where: {
                contactId_flowId: { contactId: contact.id, flowId: flow.id },
              },
              include: { flow: true, contact: true },
            })) as SessionWithRelations | null;
        }

        if (!session) {
          session = await prisma.session.create({
            data: { contactId: contact.id, flowId: flow.id, status: "Active" },
            include: { flow: true, contact: true },
          }) as SessionWithRelations;
        } else if (
          session.status === "Completed" ||
          session.status === "Errored"
        ) {
          session = await prisma.session.update({
            where: { id: session.id },
            data: { status: "Active", currentNodeId: null, context: {} },
            include: { flow: true, contact: true },
          }) as SessionWithRelations;
        } else if (!session.flow || !session.contact) {
          session = await prisma.session.findUnique({
            where: { id: session.id },
            include: { flow: true, contact: true },
          }) as SessionWithRelations | null;
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
            console.error("Session could not be resolved for contact", contact.id);
            continue;
          }

          await executeFlow(
            session,
            text,
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

/* ===== Envío de mensajes a WhatsApp (Graph API) ===== */
type SendMessagePayload =
  | { type: "text"; text: string }
  | {
      type: "media";
      mediaType: "image" | "video" | "audio" | "document";
      url: string;
      caption?: string;
    }
  | { type: "options"; text: string; options: string[] };

const GRAPH_VERSION = "v20.0";
const API_TIMEOUT_MS = 15000;

export async function sendMessage(
  userId: string,
  to: string,
  message: SendMessagePayload,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { metaAccessToken: true, metaPhoneNumberId: true },
  });

  const envConfig = getMetaEnvironmentConfig();

  const accessToken = user?.metaAccessToken ?? envConfig.accessToken;
  const phoneNumberId = user?.metaPhoneNumberId ?? envConfig.phoneNumberId;

  if (!accessToken || !phoneNumberId) {
    console.error("Missing Meta API credentials for user:", userId);
    return false;
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
        to,
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
        to,
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
        to,
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
  }

  // Llamada con timeout/abort
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body ?? {}),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error(
        "Error sending message:",
        res.status,
        txt || res.statusText,
      );
      return false;
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("Error sending message: request timeout");
      return false;
    }
    console.error("Error sending message:", error);
    return false;
  } finally {
    clearTimeout(t);
  }

  return true;
}
