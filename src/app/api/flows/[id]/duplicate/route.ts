import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type DuplicateOverrides = {
  name?: string;
  trigger?: string | null;
  status?: string | null;
  phoneNumber?: string | null;
};

function buildUniqueName(baseName: string, existingNames: Set<string>) {
  if (!existingNames.has(baseName)) {
    return baseName;
  }

  let suffix = 2;
  let candidate = `${baseName} ${suffix}`;

  while (existingNames.has(candidate) && suffix < 100) {
    suffix += 1;
    candidate = `${baseName} ${suffix}`;
  }

  if (existingNames.has(candidate)) {
    return `${baseName} ${Date.now()}`;
  }

  return candidate;
}

function buildUniqueTrigger(baseTrigger: string, existingTriggers: Set<string>) {
  if (!baseTrigger) {
    baseTrigger = "default";
  }

  if (!existingTriggers.has(baseTrigger)) {
    return baseTrigger;
  }

  let suffix = 2;
  let candidate = `${baseTrigger}-${suffix}`;

  while (existingTriggers.has(candidate) && suffix < 100) {
    suffix += 1;
    candidate = `${baseTrigger}-${suffix}`;
  }

  if (existingTriggers.has(candidate)) {
    return `${baseTrigger}-${Date.now()}`;
  }

  return candidate;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const overrides = (await request
      .json()
      .catch(() => ({}))) as DuplicateOverrides | undefined;

    const sourceFlow = await prisma.flow.findUnique({
      where: { id: params.id },
    });

    if (!sourceFlow) {
      return NextResponse.json(
        { error: "Flow not found" },
        { status: 404 },
      );
    }

    const siblingFlows = await prisma.flow.findMany({
      where: { userId: sourceFlow.userId },
      select: { name: true, trigger: true },
    });

    const sourceName = sourceFlow.name?.trim() || "Flujo sin nombre";
    const existingNames = new Set(
      siblingFlows.map((flow) => flow.name?.trim()).filter(Boolean) as string[],
    );
    const existingTriggers = new Set(
      siblingFlows
        .map((flow) => flow.trigger?.trim())
        .filter((trigger): trigger is string => Boolean(trigger)),
    );

    const baseName =
      typeof overrides?.name === "string" && overrides.name.trim().length
        ? overrides.name.trim()
        : `${sourceName} (Copia)`;
    const name = buildUniqueName(baseName, existingNames);

    const baseTrigger =
      typeof overrides?.trigger === "string"
        ? overrides.trigger.trim()
        : sourceFlow.trigger
        ? `${sourceFlow.trigger}-copy`
        : "default-copy";
    const trigger = buildUniqueTrigger(baseTrigger, existingTriggers);

    const status =
      typeof overrides?.status === "string" && overrides.status.trim().length
        ? overrides.status.trim()
        : "Draft";

    const phoneNumber =
      typeof overrides?.phoneNumber === "string"
        ? overrides.phoneNumber.trim() || null
        : sourceFlow.phoneNumber;

    const duplicatedFlow = await prisma.flow.create({
      data: {
        name,
        trigger,
        status,
        definition: sourceFlow.definition,
        phoneNumber,
        userId: sourceFlow.userId,
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

    return NextResponse.json(duplicatedFlow, { status: 201 });
  } catch (error) {
    console.error(`Error duplicating flow ${params.id}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
