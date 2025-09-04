import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { processWebhookEvent } from "@/lib/meta";
import crypto from "crypto";

const prisma = new PrismaClient();

const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

// This endpoint is used for webhook verification.
// Meta sends a GET request with a challenge to this endpoint.
// The verify token is a global token stored in an environment variable,
// as the verification request from Meta does not contain any user-identifying information.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === META_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  } else {
    return new NextResponse("Forbidden", { status: 403 });
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("x-hub-signature-256");
  const body = await request.text();

  if (!signature) {
    return new NextResponse("No signature", { status: 401 });
  }

  const data = JSON.parse(body);
  const phoneNumberId =
    data.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

  if (!phoneNumberId) {
    return new NextResponse("Missing phone number ID", { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { metaPhoneNumberId: phoneNumberId },
  });

  if (!user || !user.metaAppSecret) {
    console.error(
      "User not found or metaAppSecret not set for phone number ID:",
      phoneNumberId,
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }

  const hmac = crypto.createHmac("sha256", user.metaAppSecret);
  hmac.update(body);
  const expectedSignature = `sha256=${hmac.digest("hex")}`;

  if (signature !== expectedSignature) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  // Process the message
  await processWebhookEvent(data);

  return new NextResponse("OK", { status: 200 });
}
