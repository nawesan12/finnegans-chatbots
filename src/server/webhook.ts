import crypto from "crypto";

import {
  processManualFlowTrigger,
  processWebhookEvent,
  type MetaWebhookEvent,
} from "@/lib/whatsapp";
import prisma from "@/lib/prisma";

export type WebhookResult =
  | { status: number; headers?: Record<string, string>; json: unknown }
  | { status: number; headers?: Record<string, string>; text: string }
  | { status: number; headers?: Record<string, string> };

async function isVerifyTokenValid(token: string | null, userId?: string) {
  if (!token) {
    return false;
  }

  const trimmedToken = token.trim();

  if (!trimmedToken) {
    return false;
  }

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
  request: Request,
  payload: Record<string, unknown>,
): string | null {
  const headerToken = request.headers.get("x-webhook-token");
  if (headerToken && headerToken.trim().length > 0) {
    return headerToken.trim();
  }

  const { searchParams } = new URL(request.url);
  const queryToken = searchParams.get("token");
  if (queryToken && queryToken.trim().length > 0) {
    return queryToken.trim();
  }

  const bodyToken = payload.token;
  if (typeof bodyToken === "string" && bodyToken.trim().length > 0) {
    return bodyToken.trim();
  }

  return null;
}

type SupportedSignatureAlgorithm = "sha256" | "sha1";

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
    if (!digestRaw) {
      continue;
    }

    const algorithm = algorithmRaw?.trim().toLowerCase();
    if (algorithm !== "sha256" && algorithm !== "sha1") {
      continue;
    }

    const digest = digestRaw.trim();
    if (!/^[0-9a-fA-F]+$/.test(digest) || digest.length % 2 !== 0) {
      continue;
    }

    try {
      candidates.push({
        algorithm,
        digest: Buffer.from(digest, "hex"),
      });
    } catch (error) {
      console.error("Failed to parse webhook signature digest", error);
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

  if (!candidates.length) {
    return false;
  }

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
      console.error("Failed to verify webhook signature", error);
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

function withFlowTriggerCors(result: WebhookResult): WebhookResult {
  return {
    ...result,
    headers: {
      ...FLOW_TRIGGER_CORS_HEADERS,
      ...result.headers,
    },
  };
}

async function handleFlowTrigger(request: Request, flowId: string) {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch (error) {
    console.error("Invalid JSON payload for flow trigger:", error);
    return withFlowTriggerCors({
      status: 400,
      json: { error: "Invalid JSON payload" },
    });
  }

  if (!isPlainObject(parsed)) {
    return withFlowTriggerCors({
      status: 400,
      json: { error: "Payload must be a JSON object" },
    });
  }

  const flow = await prisma.flow.findUnique({
    where: { id: flowId },
    include: { user: true },
  });

  if (!flow) {
    return withFlowTriggerCors({
      status: 404,
      json: { error: "Flow not found" },
    });
  }

  const token = getWebhookToken(request, parsed);
  const validToken = await isVerifyTokenValid(token, flow.userId);

  if (!validToken) {
    return withFlowTriggerCors({
      status: 403,
      json: { error: "Forbidden" },
    });
  }

  const from =
    pickFirstString(parsed, ["from", "phone", "wa_id", "waId"]) ?? null;

  if (!from) {
    return withFlowTriggerCors({
      status: 400,
      json: { error: "Missing contact phone identifier" },
    });
  }

  const message =
    pickFirstString(parsed, [
      "message",
      "text",
      "keyword",
      "trigger",
      "input",
      "body",
    ]) ?? null;

  if (!message) {
    return withFlowTriggerCors({
      status: 400,
      json: { error: "Missing message text" },
    });
  }

  const profile = isPlainObject(parsed.profile) ? parsed.profile : null;
  const name =
    pickFirstString(parsed, ["name", "fullName", "contactName"]) ??
    (profile ? pickFirstString(profile, ["name", "fullName"]) : null);

  const variables =
    isPlainObject(parsed.variables) && Object.keys(parsed.variables).length
      ? (parsed.variables as Record<string, unknown>)
      : null;

  const interactive = isPlainObject(parsed.interactive)
    ? {
        type:
          pickFirstString(parsed.interactive, ["type", "interactiveType"]) ??
          null,
        id:
          pickFirstString(parsed.interactive, ["id", "selectionId", "value"]) ??
          null,
        title:
          pickFirstString(parsed.interactive, ["title", "text", "label"]) ??
          null,
      }
    : null;

  const incomingMeta = {
    type:
      pickFirstString(parsed, ["type", "messageType"]) ??
      (interactive && interactive.type ? "interactive" : "text"),
    rawText:
      pickFirstString(parsed, ["rawText", "raw", "message", "text"]) ?? message,
    interactive:
      interactive && (interactive.id || interactive.title || interactive.type)
        ? interactive
        : null,
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
    return withFlowTriggerCors({
      status: result.status ?? 500,
      json: { error: result.error },
    });
  }

  return withFlowTriggerCors({
    status: 200,
    json: {
      success: true,
      flowId: result.flowId,
      sessionId: result.sessionId,
      contactId: result.contactId,
    },
  });
}

export async function handleWebhookGet(request: Request): Promise<WebhookResult> {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode?.toLowerCase() !== "subscribe") {
      return { status: 400, text: "Invalid mode" };
    }
    if (!challenge) {
      return { status: 400, text: "Missing hub.challenge" };
    }

    const trimmedToken = token?.trim();
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
    console.error("Webhook verification error:", error);
    return { status: 500, text: "Internal Server Error" };
  }
}

export async function handleWebhookPost(
  request: Request,
): Promise<WebhookResult> {
  const { searchParams } = new URL(request.url);
  const flowId = searchParams.get("flowId");

  if (flowId) {
    return handleFlowTrigger(request, flowId);
  }

  try {
    const signatureHeader =
      request.headers.get("x-hub-signature-256") ??
      request.headers.get("x-hub-signature");

    if (!signatureHeader) {
      return { status: 401, json: { error: "Missing signature" } };
    }

    const body = await request.text();

    if (!body) {
      return { status: 400, json: { error: "Empty payload" } };
    }

    let data: MetaWebhookEvent;
    try {
      data = JSON.parse(body) as MetaWebhookEvent;
    } catch (error) {
      console.error("Invalid webhook payload:", error);
      return { status: 400, json: { error: "Invalid JSON payload" } };
    }

    const phoneNumberId =
      data?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

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
      console.error(
        "User/app secret not configured for phone number ID:",
        phoneNumberId,
      );
      return { status: 404, json: { error: "User not configured" } };
    }

    if (!verifyWebhookSignature(signatureHeader, body, appSecret)) {
      return { status: 401, json: { error: "Invalid signature" } };
    }

    await processWebhookEvent(data);

    return { status: 200, json: { success: true } };
  } catch (error) {
    console.error("Webhook processing error:", error);
    return { status: 500, json: { error: "Internal Server Error" } };
  }
}

export async function handleWebhookOptions(
  request: Request,
): Promise<WebhookResult> {
  const { searchParams } = new URL(request.url);
  const flowId = searchParams.get("flowId");

  if (!flowId) {
    return { status: 404, json: { error: "Not Found" } };
  }

  return withFlowTriggerCors({ status: 204 });
}
