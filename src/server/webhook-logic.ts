import crypto from "crypto";
import {
  processManualFlowTrigger,
  processWebhookEvent,
} from "@/lib/whatsapp/webhook";
import { type MetaWebhookEvent } from "@/lib/whatsapp/types";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

// Generic request and response types to decouple from frameworks
export interface WebhookRequest {
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | string[] | undefined>;
  body: string;
  url: string;
}

export interface WebhookResponse {
  status: number;
  headers?: Record<string, string>;
  json?: unknown;
  text?: string;
}

async function isVerifyTokenValid(token: string | null, userId?: string) {
  if (!token) return false;
  const trimmedToken = token.trim();
  if (!trimmedToken) return false;

  const userWithToken = await prisma.user.findFirst({
    where: {
      metaVerifyToken: trimmedToken,
      ...(userId ? { id: userId } : {}),
    },
    select: { id: true },
  });

  return Boolean(userWithToken);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickFirstString(
  source: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function getWebhookToken(
  req: WebhookRequest,
  payload: Record<string, unknown>,
): string | null {
    const headerToken = req.headers["x-webhook-token"];
    if (typeof headerToken === "string" && headerToken.trim().length > 0) {
        return headerToken.trim();
    }

    const queryToken = req.query.token;
    if (typeof queryToken === "string" && queryToken.trim().length > 0) {
        return queryToken.trim();
    }

    const bodyToken = payload.token;
    if (typeof bodyToken === "string" && bodyToken.trim().length > 0) {
        return bodyToken.trim();
    }

  return null;
}

type SupportedSignatureAlgorithm = "sha256";

type SignatureCandidate = {
  algorithm: SupportedSignatureAlgorithm;
  digest: Buffer;
};

function parseSignatureHeader(signature: string): SignatureCandidate[] {
  const segments = signature
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  const candidates: SignatureCandidate[] = [];

  for (const segment of segments) {
    const [algorithmRaw, digestRaw] = segment.split("=");
    if (!digestRaw) continue;

    const algorithm = algorithmRaw?.trim().toLowerCase();
    if (algorithm !== "sha256") continue;

    const digest = digestRaw.trim();
    if (!/^[0-9a-fA-F]+$/.test(digest) || digest.length % 2 !== 0) continue;

    try {
      candidates.push({
        algorithm: algorithm as SupportedSignatureAlgorithm,
        digest: Buffer.from(digest, "hex"),
      });
    } catch (error) {
      logger.error("Failed to parse webhook signature digest", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return candidates;
}

function verifyWebhookSignature(
  signatureHeader: string,
  payload: string,
  secret: string,
): boolean {
  const candidates = parseSignatureHeader(signatureHeader);
  if (!candidates.length) return false;

  for (const candidate of candidates) {
    try {
      const hmac = crypto.createHmac(candidate.algorithm, secret);
      hmac.update(payload);
      const expected = Buffer.from(hmac.digest("hex"), "hex");

      if (
        expected.length === candidate.digest.length &&
        crypto.timingSafeEqual(expected, candidate.digest)
      ) {
        return true;
      }
    } catch (error) {
      logger.error("Failed to verify webhook signature", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return false;
}

const FLOW_TRIGGER_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Webhook-Token",
  "Access-Control-Max-Age": "300",
} as const;

async function processFlowTrigger(
  req: WebhookRequest,
  flowId: string,
): Promise<WebhookResponse> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(req.body);
  } catch (error) {
    logger.error("Invalid JSON payload for flow trigger", {
        error: error instanceof Error ? error.message : String(error),
        flowId,
    });
    return {
      status: 400,
      json: { error: "Invalid JSON payload" },
      headers: FLOW_TRIGGER_CORS_HEADERS,
    };
  }

  if (!isPlainObject(parsed)) {
    return {
      status: 400,
      json: { error: "Payload must be a JSON object" },
      headers: FLOW_TRIGGER_CORS_HEADERS,
    };
  }

  const flow = await prisma.flow.findUnique({
    where: { id: flowId },
    include: { user: true },
  });

  if (!flow) {
    return {
      status: 404,
      json: { error: "Flow not found" },
      headers: FLOW_TRIGGER_CORS_HEADERS,
    };
  }

  const token = getWebhookToken(req, parsed);
  const validToken = await isVerifyTokenValid(token, flow.userId);

  if (!validToken) {
    return {
      status: 403,
      json: { error: "Forbidden" },
      headers: FLOW_TRIGGER_CORS_HEADERS,
    };
  }

  const from = pickFirstString(parsed, ["from", "phone", "wa_id", "waId"]) ?? null;
  if (!from) {
    return {
        status: 400,
        json: { error: "Missing contact phone identifier" },
        headers: FLOW_TRIGGER_CORS_HEADERS,
    };
  }

  const message = pickFirstString(parsed, ["message", "text", "keyword", "trigger", "input", "body"]) ?? null;
  if (!message) {
    return {
        status: 400,
        json: { error: "Missing message text" },
        headers: FLOW_TRIGGER_CORS_HEADERS,
    };
  }

  const profile = isPlainObject(parsed.profile) ? parsed.profile : null;
  const name = pickFirstString(parsed, ["name", "fullName", "contactName"]) ??
    (profile ? pickFirstString(profile, ["name", "fullName"]) : null);

  const variables = isPlainObject(parsed.variables) && Object.keys(parsed.variables).length
      ? (parsed.variables as Record<string, unknown>)
      : null;

  const interactive = isPlainObject(parsed.interactive)
    ? {
        type: pickFirstString(parsed.interactive, ["type", "interactiveType"]) ?? null,
        id: pickFirstString(parsed.interactive, ["id", "selectionId", "value"]) ?? null,
        title: pickFirstString(parsed.interactive, ["title", "text", "label"]) ?? null,
      }
    : null;

  const incomingMeta = {
    type: pickFirstString(parsed, ["type", "messageType"]) ?? (interactive && interactive.type ? "interactive" : "text"),
    rawText: pickFirstString(parsed, ["rawText", "raw", "message", "text"]) ?? message,
    interactive: interactive && (interactive.id || interactive.title || interactive.type) ? interactive : null,
  };

  const result = await processManualFlowTrigger({
    flowId,
    from,
    name,
    message,
    variables,
    incomingMeta,
  });

  if (!result.success) {
    return {
        status: result.status ?? 500,
        json: { error: result.error },
        headers: FLOW_TRIGGER_CORS_HEADERS,
    };
  }

  return {
    status: 200,
    json: {
      success: true,
      flowId: result.flowId,
      sessionId: result.sessionId,
      contactId: result.contactId,
    },
    headers: FLOW_TRIGGER_CORS_HEADERS,
  };
}

export async function processWebhookGet(
  req: WebhookRequest,
): Promise<WebhookResponse> {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode !== "subscribe") {
      return { status: 400, text: "Invalid mode" };
    }
    if (typeof challenge !== "string") {
      return { status: 400, text: "Missing hub.challenge" };
    }
    if (typeof token !== "string") {
      return { status: 403, text: "Forbidden" };
    }

    const trimmedToken = token.trim();
    if (!trimmedToken) {
      return { status: 403, text: "Forbidden" };
    }

    const userWithToken = await prisma.user.findFirst({
      where: { metaVerifyToken: trimmedToken },
      select: { id: true },
    });

    if (!userWithToken) {
      return { status: 403, text: "Forbidden" };
    }

    return {
      status: 200,
      text: challenge,
      headers: { "Content-Type": "text/plain" },
    };
  } catch (error) {
    logger.error("Webhook verification error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: 500, text: "Internal Server Error" };
  }
}

export async function processWebhookPost(
  req: WebhookRequest,
): Promise<WebhookResponse> {
  const flowId = req.query.flowId;
  if (typeof flowId === "string") {
    return processFlowTrigger(req, flowId);
  }

  try {
    const signatureHeader = req.headers["x-hub-signature-256"];
    if (typeof signatureHeader !== "string") {
      return { status: 401, json: { error: "Missing signature" } };
    }

    const body = req.body;
    if (!body) {
      return { status: 400, json: { error: "Empty payload" } };
    }

    let data: MetaWebhookEvent;
    try {
      data = JSON.parse(body) as MetaWebhookEvent;
    } catch (error) {
      logger.error("Invalid webhook payload", {
        error: error instanceof Error ? error.message : String(error),
      });
      return { status: 400, json: { error: "Invalid JSON payload" } };
    }

    const phoneNumberId = data?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
    if (!phoneNumberId) {
      return { status: 400, json: { error: "Missing phone number ID" } };
    }

    const trimmedPhoneNumberId = phoneNumberId.trim();
    const user = await prisma.user.findFirst({
      where: { metaPhoneNumberId: trimmedPhoneNumberId },
      select: { id: true, metaAppSecret: true },
    });

    const appSecret = user?.metaAppSecret?.trim() ?? null;
    if (!appSecret) {
      logger.error("User/app secret not configured for phone number ID", {
        phoneNumberId,
      });
      return { status: 404, json: { error: "User not configured" } };
    }

    if (!verifyWebhookSignature(signatureHeader, body, appSecret)) {
      return { status: 401, json: { error: "Invalid signature" } };
    }

    await processWebhookEvent(data);

    return { status: 200, json: { success: true } };
  } catch (error) {
    logger.error("Webhook processing error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: 500, json: { error: "Internal Server Error" } };
  }
}

export async function processWebhookOptions(
  req: WebhookRequest,
): Promise<WebhookResponse> {
  const flowId = req.query.flowId;
  if (!flowId) {
    return { status: 404, json: { error: "Not Found" } };
  }

  return { status: 204, headers: FLOW_TRIGGER_CORS_HEADERS };
}