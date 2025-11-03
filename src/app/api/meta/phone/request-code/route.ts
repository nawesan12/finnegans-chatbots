import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthPayload } from "@/lib/auth";
import {
  MetaPhoneNumberError,
  requestMetaPhoneVerificationCode,
} from "@/lib/whatsapp/phone-number";

const RequestSchema = z
  .object({
    method: z.enum(["sms", "voice"]).default("sms"),
    locale: z.string().max(20).optional(),
  })
  .transform((data) => ({
    method: data.method,
    locale: data.locale?.trim() ? data.locale.trim() : undefined,
  }));

export async function POST(request: Request) {
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const parsed = RequestSchema.safeParse(payload ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const result = await requestMetaPhoneVerificationCode(auth.userId, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MetaPhoneNumberError) {
      return NextResponse.json(
        { error: error.message, details: error.details ?? null },
        { status: error.status ?? 500 },
      );
    }

    console.error("Failed to request Meta verification code", error);
    return NextResponse.json(
      { error: "Failed to request verification code" },
      { status: 500 },
    );
  }
}
