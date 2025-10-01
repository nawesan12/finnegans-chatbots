import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getMetaEnvironmentConfig } from "@/lib/meta";

const formatSettingsResponse = (input: {
  metaVerifyToken: string | null;
  metaAppSecret: string | null;
  metaAccessToken: string | null;
  metaPhoneNumberId: string | null;
}) => {
  const envConfig = getMetaEnvironmentConfig();

  return {
    metaVerifyToken: input.metaVerifyToken ?? envConfig.verifyToken ?? "",
    metaAppSecret: input.metaAppSecret ?? envConfig.appSecret ?? "",
    metaAccessToken: input.metaAccessToken ?? envConfig.accessToken ?? "",
    metaPhoneNumberId:
      input.metaPhoneNumberId ?? envConfig.phoneNumberId ?? "",
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

  const updatedUser = await prisma.user.update({
    where: { id: userPayload.userId },
    data: {
      metaVerifyToken: metaVerifyToken ?? null,
      metaAppSecret: metaAppSecret ?? null,
      metaAccessToken: metaAccessToken ?? null,
      metaPhoneNumberId: metaPhoneNumberId ?? null,
    },
    select: {
      metaVerifyToken: true,
      metaAppSecret: true,
      metaAccessToken: true,
      metaPhoneNumberId: true,
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
    },
    select: {
      metaVerifyToken: true,
      metaAppSecret: true,
      metaAccessToken: true,
      metaPhoneNumberId: true,
    },
  });

  return NextResponse.json(formatSettingsResponse(clearedUser));
}
