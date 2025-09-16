import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const broadcast = await prisma.broadcast.findUnique({
      where: { id: params.id },
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
      return NextResponse.json({ error: "Broadcast not found" }, { status: 404 });
    }

    return NextResponse.json(broadcast);
  } catch (error) {
    console.error(`Error fetching broadcast ${params.id}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
