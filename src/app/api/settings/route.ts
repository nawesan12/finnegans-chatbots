import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/auth";

const prisma = new PrismaClient();

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

  return NextResponse.json(user);
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
  const {
    metaVerifyToken,
    metaAppSecret,
    metaAccessToken,
    metaPhoneNumberId,
  } = body;

  const updatedUser = await prisma.user.update({
    where: { id: userPayload.userId },
    data: {
      metaVerifyToken,
      metaAppSecret,
      metaAccessToken,
      metaPhoneNumberId,
    },
  });

  return NextResponse.json(updatedUser);
}
