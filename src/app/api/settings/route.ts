import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

const formatSettingsResponse = (input: {
  metaVerifyToken: string | null;
  metaAppSecret: string | null;
  metaAccessToken: string | null;
  metaPhoneNumberId: string | null;
  metaBusinessAccountId: string | null;
  metaPhonePin: string | null;
}) => {
  return {
    metaVerifyToken: input.metaVerifyToken ?? "",
    metaAppSecret: input.metaAppSecret ?? "",
    metaAccessToken: input.metaAccessToken ?? "",
    metaPhoneNumberId: input.metaPhoneNumberId ?? "",
    metaBusinessAccountId: input.metaBusinessAccountId ?? "",
    metaPhonePin: input.metaPhonePin ?? "",
  };
};

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.substring(7);
  const userPayload = verifyToken(token);
  if (!userPayload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userPayload.userId },
    select: {
      metaVerifyToken: true,
      metaAppSecret: true,
      metaAccessToken: true,
      metaPhoneNumberId: true,
      metaBusinessAccountId: true,
      metaPhonePin: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(formatSettingsResponse(user));
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.substring(7);
  const userPayload = verifyToken(token);
  if (!userPayload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const metaVerifyToken =
    typeof body?.metaVerifyToken === "string"
      ? body.metaVerifyToken.trim()
      : undefined;
  const metaAppSecret =
    typeof body?.metaAppSecret === "string"
      ? body.metaAppSecret.trim()
      : undefined;
  const metaAccessToken =
    typeof body?.metaAccessToken === "string"
      ? body.metaAccessToken.trim()
      : undefined;
  const metaPhoneNumberId =
    typeof body?.metaPhoneNumberId === "string"
      ? body.metaPhoneNumberId.trim()
      : undefined;
  const metaBusinessAccountId =
    typeof body?.metaBusinessAccountId === "string"
      ? body.metaBusinessAccountId.trim()
      : undefined;
  const metaPhonePin =
    typeof body?.metaPhonePin === "string" ? body.metaPhonePin.trim() : undefined;

  const updatedUser = await prisma.user.update({
    where: { id: userPayload.userId },
    data: {
      metaVerifyToken: metaVerifyToken ?? null,
      metaAppSecret: metaAppSecret ?? null,
      metaAccessToken: metaAccessToken ?? null,
      metaPhoneNumberId: metaPhoneNumberId ?? null,
      metaBusinessAccountId: metaBusinessAccountId ?? null,
      metaPhonePin: metaPhonePin ?? null,
    },
    select: {
      metaVerifyToken: true,
      metaAppSecret: true,
      metaAccessToken: true,
      metaPhoneNumberId: true,
      metaBusinessAccountId: true,
      metaPhonePin: true,
    },
  });

  return NextResponse.json(formatSettingsResponse(updatedUser));
}

export async function DELETE(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.substring(7);
  const userPayload = verifyToken(token);
  if (!userPayload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clearedUser = await prisma.user.update({
    where: { id: userPayload.userId },
    data: {
      metaVerifyToken: null,
      metaAppSecret: null,
      metaAccessToken: null,
      metaPhoneNumberId: null,
      metaBusinessAccountId: null,
      metaPhonePin: null,
    },
    select: {
      metaVerifyToken: true,
      metaAppSecret: true,
      metaAccessToken: true,
      metaPhoneNumberId: true,
      metaBusinessAccountId: true,
      metaPhonePin: true,
    },
  });

  return NextResponse.json(formatSettingsResponse(clearedUser));
}
