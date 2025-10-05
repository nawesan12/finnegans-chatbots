import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { sanitizeFlowDefinition } from "@/lib/flow-schema";
import { createMetaFlow, MetaFlowError } from "@/lib/meta-flow";

const FlowPayloadSchema = z.object({
  name: z.string().min(1),
  trigger: z.string().optional(),
  status: z.string().optional(),
  definition: z.unknown().optional(),
});

export async function GET(request: Request) {
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Prisma.FlowWhereInput = {
      userId: auth.userId,
    };
    if (status) where.status = status;

    const flows = await prisma.flow.findMany({
      where,
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        _count: {
          select: {
            broadcasts: true,
            sessions: true,
          },
        },
      },
    });
    return NextResponse.json(flows);
  } catch (error) {
    console.error("Error fetching flows:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const parsed = FlowPayloadSchema.safeParse(payload);

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
    const remote = await createMetaFlow(auth.userId, {
      name: trimmedName,
      definition: definitionJson,
      status: normalizedStatus,
    });

    const newFlow = await prisma.flow.create({
      data: {
        name: trimmedName,
        trigger: normalizedTrigger,
        status: normalizedStatus,
        definition: definitionJson,
        metaFlowId: remote.id,
        metaFlowToken: remote.token,
        metaFlowVersion: remote.version,
        metaFlowRevisionId: remote.revisionId,
        metaFlowStatus: remote.status,
        metaFlowMetadata: (remote.raw ?? null) as Prisma.JsonValue,
        user: { connect: { id: auth.userId } },
      },
      include: {
        _count: {
          select: {
            broadcasts: true,
            sessions: true,
          },
        },
      },
    });

    return NextResponse.json(newFlow, { status: 201 });
  } catch (error) {
    if (error instanceof MetaFlowError) {
      return NextResponse.json(
        { error: error.message, details: error.details ?? null },
        { status: error.status ?? 502 },
      );
    }
    console.error("Error creating flow:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
