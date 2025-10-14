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

async function attemptSendMessage(
  options: {
    userId: string;
    accessToken: string;
    phoneNumberId: string;
    messageBody: Record<string, unknown>;
    normalizedTo: string;
  },
  attempt = 1,
): Promise<SendMessageResult> {
  const { userId, accessToken, phoneNumberId, messageBody, normalizedTo } = options;
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

      logger.error("Error sending message to Meta API", {
        status: res.status,
        details: json,
        userId,
      });
      const errorMessage =
        metaError?.message ?? "Failed to send message via Meta API";
      return {
        success: false,
        status: res.status,
        error: errorMessage,
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
    select: {
      metaAccessToken: true,
      metaPhoneNumberId: true,
    },
  });

  const accessToken = user?.metaAccessToken?.trim();
  const phoneNumberId = user?.metaPhoneNumberId?.trim();

  if (!accessToken || !phoneNumberId) {
    const error = "Missing Meta API credentials for user";
    logger.error(error, { userId });
    return { success: false, error };
  }

  const buildResult = buildMetaMessageBody(normalizedTo, message);
  if (!buildResult.ok) {
    return buildResult.result;
  }

  return attemptSendMessage(
    {
      userId,
      accessToken,
      phoneNumberId,
      messageBody: buildResult.body,
      normalizedTo,
    },
    1,
  );
}
