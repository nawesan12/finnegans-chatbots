import prisma from "@/lib/prisma";
import {
  SendMessagePayload,
  SendMessageResult,
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

type MetaApiErrorInfo = {
  message?: string;
  code?: number;
  errorSubcode?: number;
};

type MetaCredentials = {
  accessToken: string;
  phoneNumberId: string;
};

const META_NOT_ALLOWED_CODE = 131030;
const META_ALREADY_ALLOWED_CODE = 131031;
const META_SANDBOX_NOT_ALLOWED_SUBCODE = 2494003;

const extractMetaError = (details: unknown): MetaApiErrorInfo | null => {
  if (!details || typeof details !== "object") {
    return null;
  }

  const error = (details as { error?: unknown }).error;
  if (!error || typeof error !== "object") {
    return null;
  }

  const raw = error as {
    message?: unknown;
    code?: unknown;
    error_subcode?: unknown;
  };

  const result: MetaApiErrorInfo = {};
  if (typeof raw.message === "string") {
    result.message = raw.message;
  }
  if (typeof raw.code === "number") {
    result.code = raw.code;
  }
  if (typeof raw.error_subcode === "number") {
    result.errorSubcode = raw.error_subcode;
  }

  return result;
};

const isRecipientNotAllowedError = (
  error: MetaApiErrorInfo | null,
): boolean => {
  if (!error) {
    return false;
  }

  if (error.code === META_NOT_ALLOWED_CODE) {
    return true;
  }

  if (error.errorSubcode === META_SANDBOX_NOT_ALLOWED_SUBCODE) {
    return true;
  }

  const normalizedMessage = error.message?.toLowerCase() ?? "";
  return normalizedMessage.includes("allowed list");
};

const isRecipientAlreadyAllowListedError = (
  error: MetaApiErrorInfo | null,
): boolean => {
  if (!error) {
    return false;
  }

  if (error.code === META_ALREADY_ALLOWED_CODE) {
    return true;
  }

  const normalizedMessage = error.message?.toLowerCase() ?? "";
  return (
    normalizedMessage.includes("already") &&
    normalizedMessage.includes("allowed list")
  );
};

const parseJsonResponse = async (res: Response): Promise<unknown> => {
  try {
    return await res.json();
  } catch (error) {
    logger.error("Failed to parse Meta API response as JSON", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

const extractMessageIdentifiers = (json: unknown) => {
  let messageId: string | null = null;
  let conversationId: string | null = null;

  if (json && typeof json === "object") {
    const payload = json as Record<string, unknown>;

    const messagesValue = (payload as { messages?: unknown }).messages;
    if (Array.isArray(messagesValue)) {
      const messages = messagesValue as Array<{ id?: unknown }>;
      const firstMessageId = messages.find(
        (entry): entry is { id: string } => typeof entry?.id === "string",
      )?.id;
      if (firstMessageId) {
        messageId = firstMessageId;
      }
    }

    const conversationValue = (payload as { conversation?: unknown }).conversation;
    if (conversationValue && typeof conversationValue === "object") {
      const conversation = conversationValue as { id?: unknown };
      if (typeof conversation.id === "string") {
        conversationId = conversation.id;
      }
    }
  }

  return { messageId, conversationId };
};

async function addRecipientToSandboxAllowList(
  userId: string,
  normalizedWaId: string,
  credentials: MetaCredentials,
): Promise<boolean> {
  const { accessToken, phoneNumberId } = credentials;
  if (!accessToken || !phoneNumberId) {
    return false;
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/allowed_senders`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  const payload = {
    wa_id: normalizedWaId,
    messaging_product: "whatsapp",
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), META_API_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const json = await parseJsonResponse(res);
    if (res.ok) {
      logger.info("Added recipient to WhatsApp sandbox allow list", {
        userId,
        waId: normalizedWaId,
      });
      return true;
    }

    const metaError = extractMetaError(json);
    const errorMessage = metaError?.message ?? "Failed to update allow list";

    if (isRecipientAlreadyAllowListedError(metaError) || res.status === 409) {
      logger.info("Recipient already present in allow list", {
        userId,
        waId: normalizedWaId,
      });
      return true;
    }

    logger.error("Failed to add recipient to WhatsApp sandbox allow list", {
      userId,
      waId: normalizedWaId,
      status: res.status,
      error: errorMessage,
      details: json,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      logger.error("Allow list request to Meta API timed out", { userId });
    } else {
      logger.error("Error adding recipient to sandbox allow list", {
        userId,
        waId: normalizedWaId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } finally {
    clearTimeout(timeout);
  }

  return false;
}

async function sendMessageInternal(
  userId: string,
  normalizedTo: string,
  message: SendMessagePayload,
  credentials: MetaCredentials,
  retryAttempted: boolean,
): Promise<SendMessageResult> {
  const { accessToken, phoneNumberId } = credentials;
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

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
      if (!message.id && !message.url) {
        return {
          success: false,
          status: 400,
          error: "Media message must have either an id or a url",
        };
      }

      const allowed: Record<string, true> = {
        image: true,
        video: true,
        audio: true,
        document: true,
      };
      const mType = allowed[message.mediaType] ? message.mediaType : "image";

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
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizedTo,
        type: mType,
        [mType]: mediaObject,
      };
      break;
    }

    case "options": {
      const options = (message.options || []).slice(0, 3);
      body = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizedTo,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: message.text },
          action: {
            buttons: options.map((opt) => ({
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

    case "list": {
      const sections = Array.isArray(message.sections)
        ? message.sections.map((section) => ({
            title: section.title,
            rows: Array.isArray(section.rows)
              ? section.rows.map((row) => ({ id: row.id, title: row.title }))
              : [],
          }))
        : [];

      body = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizedTo,
        type: "interactive",
        interactive: {
          type: "list",
          body: { text: message.text },
          action: {
            button: message.button,
            sections,
          },
        },
      };
      break;
    }

    case "flow": {
      const flowPayload = message.flow;
      const flowId = flowPayload?.id?.trim();
      const flowToken = flowPayload?.token?.trim();
      const cta = flowPayload?.cta?.trim();

      if (!flowId || !cta) {
        return {
          success: false,
          status: 400,
          error: "Missing WhatsApp Flow ID or CTA",
        };
      }

      const flowName = flowPayload?.name?.trim() ?? "whatsapp_flow";
      const flowVersion = flowPayload?.version?.trim() ?? "3";
      const header = flowPayload?.header?.trim();
      const footer = flowPayload?.footer?.trim();
      const bodyText = (flowPayload?.body ?? "").trim();

      const parameters: Record<string, unknown> = {
        flow_message_version: flowVersion,
        flow_id: flowId,
        flow_cta: cta,
      };

      if (flowToken) {
        parameters.flow_token = flowToken;
      }
      if (flowPayload?.mode) {
        parameters.mode = flowPayload.mode;
      }
      if (flowPayload?.action) {
        parameters.flow_action = flowPayload.action;
      }
      if (flowPayload?.action_payload) {
        parameters.flow_action_payload = flowPayload.action_payload;
      }

      const interactive: Record<string, unknown> = {
        type: "flow",
        action: {
          name: flowName,
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
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizedTo,
        type: "template",
        template: templatePayload,
      };
      break;
    }

    default:
      body = undefined;
  }

  if (!body) {
    return { success: false, error: "Unsupported message type" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), META_API_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const json = await parseJsonResponse(res);

    if (!res.ok) {
      const metaError = extractMetaError(json);
      const errorMessage =
        metaError?.message ?? "Error sending message via Meta API";

      logger.error("Error sending message to Meta API", {
        userId,
        status: res.status,
        error: errorMessage,
        details: json,
      });

      if (!retryAttempted && isRecipientNotAllowedError(metaError)) {
        const allowListed = await addRecipientToSandboxAllowList(
          userId,
          normalizedTo,
          credentials,
        );

        if (allowListed) {
          return sendMessageInternal(
            userId,
            normalizedTo,
            message,
            credentials,
            true,
          );
        }
      }

      return {
        success: false,
        status: res.status,
        error: errorMessage,
        details: json,
      };
    }

    const { messageId, conversationId } = extractMessageIdentifiers(json);

    return { success: true, messageId, conversationId };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      logger.error("Request to Meta API timed out", { userId });
      return { success: false, error: "Request to Meta timed out" };
    }
    logger.error("Failed to send message", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: "Unknown error" };
  } finally {
    clearTimeout(timeout);
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
    logger.error(error, { to });
    return { success: false, status: 400, error };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { metaAccessToken: true, metaPhoneNumberId: true },
  });

  const accessToken = user?.metaAccessToken?.trim() ?? null;
  const phoneNumberId = user?.metaPhoneNumberId?.trim() ?? null;

  if (!accessToken || !phoneNumberId) {
    const error = "Missing Meta API credentials for user";
    logger.error(error, { userId });
    return { success: false, error };
  }

  return sendMessageInternal(
    userId,
    normalizedTo,
    message,
    { accessToken, phoneNumberId },
    false,
  );
}
