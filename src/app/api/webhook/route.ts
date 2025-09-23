import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { processWebhookEvent } from "@/lib/meta";
import type { MetaWebhookEvent } from "@/lib/meta";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN ?? null;

async function isVerifyTokenValid(token: string | null) {
  if (!token) {
    return false;
  }

  if (META_VERIFY_TOKEN && token === META_VERIFY_TOKEN) {
    return true;
  }

  const userWithToken = await prisma.user.findFirst({
    where: { metaVerifyToken: token },
    select: { id: true },
  });

  return Boolean(userWithToken);
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
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode !== "subscribe") {
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
  try {
    const signature = request.headers.get("x-hub-signature-256");

    if (!signature) {
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
      select: { metaAppSecret: true },
    });

    if (!user?.metaAppSecret) {
      console.error(
        "User not found or metaAppSecret not set for phone number ID:",
        phoneNumberId,
      );
      return NextResponse.json({ error: "User not configured" }, { status: 404 });
    }

    const hmac = crypto.createHmac("sha256", user.metaAppSecret);
    hmac.update(body);
    const expectedSignature = `sha256=${hmac.digest("hex")}`;

    const expectedBuffer = Buffer.from(expectedSignature);
    const receivedBuffer = Buffer.from(signature);
    const signaturesMatch =
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

    if (!signaturesMatch) {
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
