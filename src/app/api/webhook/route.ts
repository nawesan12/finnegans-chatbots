import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import {
  getMetaEnvironmentConfig,
  processManualFlowTrigger,
  processWebhookEvent,
} from "@/lib/meta";
import type { MetaWebhookEvent } from "@/lib/meta";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const envMetaConfig = getMetaEnvironmentConfig();

async function isVerifyTokenValid(token: string | null, userId?: string) {
  if (!token) {
    return false;
  }

  const trimmedToken = token.trim();

  if (!trimmedToken) {
    return false;
  }

  if (
    envMetaConfig.verifyToken &&
    trimmedToken === envMetaConfig.verifyToken.trim()
  ) {
    return true;
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

function withFlowTriggerCors(response: NextResponse) {
  for (const [key, value] of Object.entries(FLOW_TRIGGER_CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

async function handleFlowTrigger(request: Request, flowId: string) {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch (error) {
    console.error("Invalid JSON payload for flow trigger:", error);
    return withFlowTriggerCors(
      NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 }),
    );
  }

  if (!isPlainObject(parsed)) {
    return withFlowTriggerCors(
      NextResponse.json(
        { error: "Payload must be a JSON object" },
        { status: 400 },
      ),
    );
  }

  const flow = await prisma.flow.findUnique({
    where: { id: flowId },
    include: { user: true },
  });

  if (!flow) {
    return withFlowTriggerCors(
      NextResponse.json({ error: "Flow not found" }, { status: 404 }),
    );
  }

  const token = getWebhookToken(request, parsed);
  const validToken = await isVerifyTokenValid(token, flow.userId);

  if (!validToken) {
    return withFlowTriggerCors(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );
  }

  const from =
    pickFirstString(parsed, ["from", "phone", "wa_id", "waId"]) ?? null;

  if (!from) {
    return withFlowTriggerCors(
      NextResponse.json(
        { error: "Missing contact phone identifier" },
        { status: 400 },
      ),
    );
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
    return withFlowTriggerCors(
      NextResponse.json({ error: "Missing message text" }, { status: 400 }),
    );
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
          pickFirstString(parsed.interactive, [
            "type",
            "interactiveType",
          ]) ?? null,
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
      pickFirstString(parsed, ["rawText", "raw", "message", "text"]) ??
      message,
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
    return withFlowTriggerCors(
      NextResponse.json(
        { error: result.error },
        { status: result.status ?? 500 },
      ),
    );
  }

  return withFlowTriggerCors(
    NextResponse.json({
      success: true,
      flowId: result.flowId,
      sessionId: result.sessionId,
      contactId: result.contactId,
    }),
  );
}

// This endpoint is used for webhook verification.
// Meta sends a GET request with a challenge to this endpoint.
// The verify token can be provided globally via the META_VERIFY_TOKEN environment
// variable or per user (stored in the database). The verification request from
// Meta does not include user-identifying information, so we try the global token
// first and then fall back to any user-level token that matches.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("hub.mode");
    const token =
      searchParams.get("hub.verify_token") ??
      searchParams.get("verify_token") ??
      searchParams.get("token");
    const challenge =
      searchParams.get("hub.challenge") ??
      searchParams.get("challenge") ??
      null;

    if (mode?.toLowerCase() !== "subscribe") {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    if (!challenge) {
      return NextResponse.json(
        { error: "Missing hub.challenge parameter" },
        { status: 400 },
      );
    }

    if (!(await isVerifyTokenValid(token))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    console.error("Webhook verification error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const body = await request.text();

    if (!body) {
      return NextResponse.json({ error: "Empty payload" }, { status: 400 });
    }

    let data: MetaWebhookEvent;
    try {
      data = JSON.parse(body) as MetaWebhookEvent;
    } catch (error) {
      console.error("Invalid webhook payload:", error);
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const phoneNumberId =
      data?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

    if (!phoneNumberId) {
      return NextResponse.json(
        { error: "Missing phone number ID" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findFirst({
      where: { metaPhoneNumberId: phoneNumberId },
      select: { id: true, metaAppSecret: true },
    });

    let appSecret = user?.metaAppSecret ?? null;

    if (
      !appSecret &&
      envMetaConfig.phoneNumberId &&
      envMetaConfig.appSecret &&
      envMetaConfig.phoneNumberId === phoneNumberId
    ) {
      appSecret = envMetaConfig.appSecret;
    }

    if (!appSecret) {
      console.error(
        "User/app secret not configured for phone number ID:",
        phoneNumberId,
      );
      return NextResponse.json({ error: "User not configured" }, { status: 404 });
    }

    if (!verifyWebhookSignature(signatureHeader, body, appSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    await processWebhookEvent(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const flowId = searchParams.get("flowId");

  if (!flowId) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const response = new NextResponse(null, { status: 204 });
  return withFlowTriggerCors(response);
}
