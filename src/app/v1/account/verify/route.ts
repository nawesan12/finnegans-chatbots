import { NextResponse } from "next/server";

import { getAuthPayload } from "@/lib/auth";
import {
  MetaVerificationError,
  verifyMetaAccount,
} from "@/lib/whatsapp/verification";

export async function POST(request: Request) {
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await verifyMetaAccount(auth.userId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MetaVerificationError) {
      return NextResponse.json(
        { error: error.message, details: error.details ?? null },
        { status: error.status ?? 500 },
      );
    }

    console.error("Failed to verify Meta account", error);
    return NextResponse.json(
      { error: "Failed to verify Meta account" },
      { status: 500 },
    );
  }
}
