import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthPayload } from "@/lib/auth";
import {
  MetaPhoneNumberError,
  verifyMetaPhoneVerificationCode,
} from "@/lib/whatsapp/phone-number";
import {
  MetaVerificationError,
  verifyMetaAccount,
} from "@/lib/whatsapp/verification";

const VerifySchema = z.object({
  code: z.string().min(4).max(12),
});

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

  const parsed = VerifySchema.safeParse(payload ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const code = parsed.data.code.trim();
  if (!code) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  try {
    const result = await verifyMetaPhoneVerificationCode(auth.userId, code);

    let verification = null;
    let verificationError: {
      message: string;
      status: number;
      details?: unknown;
    } | null = null;

    try {
      verification = await verifyMetaAccount(auth.userId);
    } catch (error) {
      if (error instanceof MetaVerificationError) {
        verificationError = {
          message: error.message,
          status: error.status,
          details: error.details ?? null,
        };
      } else {
        console.error(
          "Unexpected error while verifying Meta account after code confirmation",
          error,
        );
        verificationError = {
          message:
            "Validamos el código, pero no pudimos ejecutar la verificación automática. Intenta más tarde.",
          status: 500,
        };
      }
    }

    return NextResponse.json({
      message: result.message,
      verification,
      verificationError,
    });
  } catch (error) {
    if (error instanceof MetaPhoneNumberError) {
      return NextResponse.json(
        { error: error.message, details: error.details ?? null },
        { status: error.status ?? 500 },
      );
    }

    console.error("Failed to verify Meta code", error);
    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 },
    );
  }
}
