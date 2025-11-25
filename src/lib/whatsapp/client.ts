import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  SendMessagePayload,
  SendMessageResult,
  SendMessageContext,
} from "@/lib/whatsapp/types";
import {
  GRAPH_VERSION,
  META_API_TIMEOUT_MS,
} from "@/lib/whatsapp/config";
import {
  normalizePhone,
  toLcTrim,
} from "@/lib/whatsapp/utils";
import { logger } from "@/lib/logger";

type MetaMessageBodyResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; result: SendMessageResult };

type MetaErrorDetails = {
  code?: number;
  errorSubcode?: number;
  message?: string;
};

function buildMetaMessageBody(
  normalizedTo: string,
  message: SendMessagePayload,
): MetaMessageBodyResult {
  switch (message.type) {
    case "text":
      return {
        ok: true,
        body: { to: normalizedTo, type: "text", text: { body: message.text } },
      };
    case "media":
      if (!message.id && !message.url) {
        return {
          ok: false,
          result: {
            success: false,
            status: 400,
            error: "Media message must have either an id or a url",
          },
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
      return {
        ok: true,
        body: {
          to: normalizedTo,
          type: mType,
          [mType]: mediaObject,
        },
      };
    case "options":
      return {
        ok: true,
        body: {
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
        },
      };
    case "list":
      return {
        ok: true,
        body: {
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
        },
      };
    case "flow": {
      const flowPayload = message.flow;
      const flowId = flowPayload?.id?.trim();
      const flowToken = flowPayload?.token?.trim();
      const cta = flowPayload?.cta?.trim();

      if (!flowId || !cta) {
        return {
          ok: false,
          result: {
            success: false,
            status: 400,
            error: "Missing WhatsApp Flow ID or CTA",
          },
        };
      }

      const header = flowPayload?.header?.trim();
      const footer = flowPayload?.footer?.trim();
      const bodyText = (flowPayload?.body ?? "").trim();

      const parameters: Record<string, unknown> = {
        flow_message_version: "3",
        flow_id: flowId,
        flow_cta: cta,
      };

      if (flowToken) {
        parameters.flow_token = flowToken;
      }

      if (flowPayload.mode) {
        parameters.mode = flowPayload.mode;
      }
      if (flowPayload.action) {
        parameters.flow_action = flowPayload.action;
      }
      if (flowPayload.action_payload) {
        parameters.flow_action_payload = flowPayload.action_payload;
      }

      const interactive: Record<string, unknown> = {
        type: "flow",
        action: {
          name: "flow",
          parameters,
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

      return {
        ok: true,
        body: {
          to: normalizedTo,
          type: "interactive",
          interactive,
        },
      };
    }
    case "template": {
      const template = message.template;
      const templateName = template?.name?.trim();
      const templateLanguage = template?.language?.trim();
      if (!templateName || !templateLanguage) {
        return {
          ok: false,
          result: {
            success: false,
            status: 400,
            error: "Missing template name or language",
          },
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

      return {
        ok: true,
        body: {
          to: normalizedTo,
          type: "template",
          template: templatePayload,
        },
      };
    }
    default:
      return { ok: false, result: { success: false, error: "Unsupported message type" } };
  }
}

function extractMetaErrorDetails(json: unknown): MetaErrorDetails | null {
  if (
    typeof json !== "object" ||
    json === null ||
    !("error" in json) ||
    typeof (json as { error?: unknown }).error !== "object" ||
    (json as { error?: unknown }).error === null
  ) {
    return null;
  }

  const error = (json as { error: Record<string, unknown> }).error;
  const code = typeof error.code === "number" ? error.code : undefined;
  const errorSubcode =
    typeof error.error_subcode === "number" ? error.error_subcode : undefined;
  const message =
    typeof error.message === "string"
      ? error.message
      : typeof error.error_user_msg === "string"
        ? error.error_user_msg
        : undefined;

  return { code, errorSubcode, message };
}

async function registerRecipientInSandbox(
  userId: string,
  accessToken: string,
  phoneNumberId: string,
  normalizedPhone: string,
): Promise<boolean> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/registered_senders`;
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), META_API_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        phone_number: normalizedPhone,
      }),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      let details: unknown = null;
      try {
        details = await res.json();
      } catch {
        // ignore JSON parsing errors and fall back to null
      }
      logger.warn("Failed to register WhatsApp recipient in sandbox", {
        status: res.status,
        details,
        userId,
      });
      return false;
    }

    logger.info("Registered WhatsApp recipient in sandbox allow list", {
      userId,
      phoneNumberId,
      recipient: normalizedPhone,
    });
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      logger.warn("Timed out while registering WhatsApp recipient", {
        userId,
      });
    } else {
      logger.warn("Unexpected error while registering WhatsApp recipient", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

const phoneRegistrationPromises = new Map<string, Promise<boolean>>();

async function registerWhatsAppPhoneNumber(
  userId: string,
  accessToken: string,
  phoneNumberId: string,
  phoneNumberPin: string | null | undefined,
): Promise<boolean> {
  const pin = phoneNumberPin?.trim();
  if (!pin) {
    logger.warn(
      "Cannot register WhatsApp phone number because the PIN is missing",
      {
        userId,
        phoneNumberId,
      },
    );
    return false;
  }

  const cacheKey = `${userId}:${phoneNumberId}`;
  const inFlight = phoneRegistrationPromises.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/register`;

  const promise = (async () => {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), META_API_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          pin,
        }),
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

      if (res.ok) {
        logger.info("Registered WhatsApp phone number via Graph API", {
          userId,
          phoneNumberId,
        });
        return true;
      }

      const metaError = extractMetaErrorDetails(json);
      const message =
        metaError?.message?.trim()?.length
          ? metaError.message.trim()
          : raw || res.statusText || "Failed to register WhatsApp phone number";
      const lower = message.toLowerCase();

      if (res.status === 409 || lower.includes("already registered")) {
        logger.warn("WhatsApp phone number already registered", {
          userId,
          phoneNumberId,
        });
        return true;
      }

      logger.error("Failed to register WhatsApp phone number", {
        userId,
        phoneNumberId,
        status: res.status,
        message,
        details: json,
      });
      return false;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        logger.warn("Timed out while registering WhatsApp phone number", {
          userId,
          phoneNumberId,
        });
      } else {
        logger.error("Unexpected error while registering WhatsApp phone number", {
          userId,
          phoneNumberId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return false;
    } finally {
      clearTimeout(timeout);
      phoneRegistrationPromises.delete(cacheKey);
    }
  })();

  phoneRegistrationPromises.set(cacheKey, promise);
  return promise;
}

async function attemptSendMessage(
  options: {
    userId: string;
    accessToken: string;
    phoneNumberId: string;
    messageBody: Record<string, unknown>;
    normalizedTo: string;
    phoneNumberPin?: string | null;
  },
  attempt = 1,
): Promise<SendMessageResult> {
  const {
    userId,
    accessToken,
    phoneNumberId,
    messageBody,
    normalizedTo,
    phoneNumberPin,
  } = options;
  const body = { ...messageBody, messaging_product: "whatsapp" };
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), META_API_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });

    const json = (await res.json()) as unknown;
    if (!res.ok) {
      const metaError = extractMetaErrorDetails(json);
      let attemptedPhoneRegistration = false;

      if (
        attempt === 1 &&
        res.status === 400 &&
        metaError?.code === 133010
      ) {
        attemptedPhoneRegistration = true;
        if (
          await registerWhatsAppPhoneNumber(
            userId,
            accessToken,
            phoneNumberId,
            phoneNumberPin,
          )
        ) {
          logger.warn(
            "WhatsApp phone number was not registered. Retrying after automatic registration.",
            { userId, phoneNumberId },
          );
          return attemptSendMessage(options, attempt + 1);
        }
      }

      if (
        attempt === 1 &&
        res.status === 400 &&
        metaError?.code === 131030 &&
        (await registerRecipientInSandbox(
          userId,
          accessToken,
          phoneNumberId,
          normalizedTo,
        ))
      ) {
        return attemptSendMessage(options, attempt + 1);
      }

      const baseError =
        metaError?.message ?? "Failed to send message via Meta API";
      let normalizedError = baseError;

      if (metaError?.code === 133010) {
        if (!phoneNumberPin?.trim()) {
          normalizedError =
            "Tu número de WhatsApp no está registrado. Añade el PIN de registro en Ajustes → WhatsApp Cloud para habilitar el envío.";
        } else if (attemptedPhoneRegistration) {
          normalizedError =
            "No se pudo registrar automáticamente el número de WhatsApp con el PIN configurado. Verifica el PIN o realiza el registro manual desde Meta.";
        }
      }

      logger.error("Error sending message to Meta API", {
        status: res.status,
        details: json,
        userId,
        message: normalizedError,
      });
      return {
        success: false,
        status: res.status,
        error: normalizedError,
        details: json,
      };
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
      logger.error("Request to Meta API timed out", { userId });
      return { success: false, error: "Request to Meta timed out" };
    }
    logger.error("Failed to send message", {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    return { success: false, error: "Unknown error" };
  } finally {
    clearTimeout(timeout);
  }
}

function extractMessageContent(message: SendMessagePayload): string | null {
  switch (message.type) {
    case "text":
      return message.text;
    case "media":
      return message.caption ?? null;
    case "options":
      return message.text;
    case "list":
      return message.text;
    case "flow":
      return message.flow.body;
    case "template":
      return `Template: ${message.template.name}`;
    default:
      return null;
  }
}

export async function sendMessage(
  userId: string,
  to: string,
  message: SendMessagePayload,
  context?: SendMessageContext,
): Promise<SendMessageResult> {
  const normalizedTo = normalizePhone(to);
  if (!normalizedTo) {
    const error = "Invalid destination phone number";
    logger.error(error, { to });
    return { success: false, status: 400, error };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      metaAccessToken: true,
      metaPhoneNumberId: true,
      metaPhonePin: true,
    },
  });

  const accessToken = user?.metaAccessToken?.trim();
  const phoneNumberId = user?.metaPhoneNumberId?.trim();
  const phoneNumberPin = user?.metaPhonePin?.trim();

  if (!accessToken || !phoneNumberId) {
    const error = "Missing Meta API credentials for user";
    logger.error(error, { userId });
    return { success: false, error };
  }

  const buildResult = buildMetaMessageBody(normalizedTo, message);
  if (!buildResult.ok) {
    return buildResult.result;
  }

  const result = await attemptSendMessage(
    {
      userId,
      accessToken,
      phoneNumberId,
      messageBody: buildResult.body,
      normalizedTo,
      phoneNumberPin,
    },
    1,
  );

  // Store outgoing message if context is provided or if we should store by default
  const shouldStore = context?.storeMessage !== false;
  if (shouldStore && context?.contactId) {
    const messageContent = extractMessageContent(message);
    const messagePayload = { ...message } as unknown as Prisma.InputJsonValue;

    try {
      await prisma.message.create({
        data: {
          waMessageId: result.success ? result.messageId ?? null : null,
          direction: "outbound",
          type: message.type,
          content: messageContent,
          payload: messagePayload,
          status: result.success ? "Sent" : "Failed",
          error: result.success ? null : ("error" in result ? result.error : null),
          statusUpdatedAt: new Date(),
          contactId: context.contactId,
          userId,
          sessionId: context.sessionId ?? null,
        },
      });
    } catch (err) {
      logger.warn("Failed to store outgoing message", {
        waMessageId: result.success ? result.messageId : null,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
