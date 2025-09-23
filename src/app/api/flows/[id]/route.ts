import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const flow = await prisma.flow.findFirst({
      where: { id: params.id, userId: auth.userId },
    });

    if (!flow) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    }

    return NextResponse.json(flow);
  } catch (error) {
    console.error(`Error fetching flow ${params.id}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, trigger, status, definition, phoneNumber } = body;

    const existingFlow = await prisma.flow.findFirst({
      where: { id: params.id, userId: auth.userId },
      select: { id: true },
    });

    if (!existingFlow) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    }

    const updatedFlow = await prisma.flow.update({
      where: { id: existingFlow.id },
      data: {
        name,
        trigger,
        status,
        definition,
        phoneNumber,
        updatedAt: new Date(),
      },
      include: {
        _count: {
          select: { broadcasts: true, sessions: true },
        },
      },
    });

    return NextResponse.json(updatedFlow);
  } catch (error) {
    console.error(`Error updating flow ${params.id}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const flow = await prisma.flow.findFirst({
      where: { id: params.id, userId: auth.userId },
      select: { id: true },
    });

    if (!flow) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.log.deleteMany({ where: { flowId: flow.id } }),
      prisma.session.deleteMany({ where: { flowId: flow.id } }),
      prisma.broadcast.updateMany({
        where: { flowId: flow.id },
        data: { flowId: null },
      }),
      prisma.flow.delete({ where: { id: flow.id } }),
    ]);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`Error deleting flow ${params.id}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
