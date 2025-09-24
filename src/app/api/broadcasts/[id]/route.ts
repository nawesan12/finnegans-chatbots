import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = context.params;
  const auth = getAuthPayload(_request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const broadcast = await prisma.broadcast.findFirst({
      //@ts-expect-error we have to await the result
      where: { id: params?.id, userId: auth.userId },
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
    //@ts-expect-error we have to await the result tho
    console.error(`Error fetching broadcast ${params?.id}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
