import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { sanitizeFlowDefinition } from "@/lib/flow-schema";
import { createMetaFlow, MetaFlowError } from "@/lib/meta-flow";
import { toNullableJsonInput } from "@/lib/json";

const FlowPayloadSchema = z.object({
  name: z.string().min(1),
  trigger: z.string().optional(),
  status: z.string().optional(),
  definition: z.unknown().optional(),
});

const isRecoverableMetaError = (error: MetaFlowError): boolean => {
  if (!error?.status) {
    return true;
  }

  if (error.status >= 500) {
    return true;
  }

  if (error.status === 504) {
    return true;
  }

  return error.message?.includes("Missing Meta credentials");
};

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
    let metaSyncWarning: string | null = null;
    let remote:
      | {
          id: string;
          token: string | null;
          version: string | null;
          revisionId: string | null;
          status: string | null;
          raw: unknown;
        }
      | null = null;

    try {
      remote = await createMetaFlow(auth.userId, {
        name: trimmedName,
        definition: definitionJson,
        status: normalizedStatus,
      });
    } catch (error) {
      if (error instanceof MetaFlowError && isRecoverableMetaError(error)) {
        console.warn("Meta Flow sync failed while creating flow:", error.message);
        metaSyncWarning = error.message ?? "Meta Flow sync failed";
      } else {
        throw error;
      }
    }

    const metaFlowData = remote
      ? {
          metaFlowId: remote.id,
          metaFlowToken: remote.token,
          metaFlowVersion: remote.version,
          metaFlowRevisionId: remote.revisionId,
          metaFlowStatus: remote.status,
          metaFlowMetadata: toNullableJsonInput(remote.raw),
        }
      : {
          metaFlowStatus: "Pending",
        };

    const newFlow = await prisma.flow.create({
      data: {
        name: trimmedName,
        trigger: normalizedTrigger,
        status: normalizedStatus,
        definition: definitionJson,
        ...metaFlowData,
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

    return NextResponse.json(
      metaSyncWarning ? { ...newFlow, metaSyncWarning } : newFlow,
      { status: 201 },
    );
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
