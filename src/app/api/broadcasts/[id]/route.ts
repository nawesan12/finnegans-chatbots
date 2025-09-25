import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const broadcast = await prisma.broadcast.findFirst({
      where: { id, userId: auth.userId },
      include: {
        recipients: {
          orderBy: { createdAt: "asc" },
          include: {
            contact: {
              select: { id: true, name: true, phone: true },
            },
          },
        },
        flow: { select: { id: true, name: true } },
      },
    });

    if (!broadcast) {
      return NextResponse.json(
        { error: "Broadcast not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(broadcast);
  } catch (error) {
    console.error(`Error fetching broadcast ${id}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
