import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { sanitizeFlowDefinition } from "@/lib/flow-schema";

const FlowUpdateSchema = z.object({
  name: z.string().min(1),
  trigger: z.string().optional(),
  status: z.string().optional(),
  definition: z.unknown().optional(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
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
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const parsed = FlowUpdateSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 },
      );
    }

    const { name, trigger, status, definition } = parsed.data;
    const trimmedName = name.trim();

    if (!trimmedName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const sanitizedDefinition = sanitizeFlowDefinition(definition);
    const definitionJson = sanitizedDefinition as unknown as Prisma.JsonObject;
    const normalizedTrigger = trigger?.trim() || "default";
    const normalizedStatus = status?.trim() || "Draft";
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
        name: trimmedName,
        trigger: normalizedTrigger,
        status: normalizedStatus,
        definition: definitionJson,
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
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
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
