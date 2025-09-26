import { Prisma } from "@prisma/client";

export const DEFAULT_RANGE_DAYS = 7;
export const ALLOWED_RANGES = new Set([7, 14, 30, 90]);

export type ParsedFilters = {
  rangeDays: number;
  startDate: Date;
  endDate: Date;
  flowIds?: string[];
  channels?: string[];
  statuses?: string[];
};

export function getRange(searchParams: URLSearchParams): number {
  const rangeParam = searchParams.get("range");
  if (!rangeParam) return DEFAULT_RANGE_DAYS;

  const parsed = Number(rangeParam);
  if (Number.isFinite(parsed) && ALLOWED_RANGES.has(parsed)) {
    return parsed;
  }

  return DEFAULT_RANGE_DAYS;
}

export function normalizeMultiValue(param: string | null): string[] | undefined {
  if (!param) return undefined;

  const values = Array.from(
    new Set(
      param
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );

  return values.length ? values : undefined;
}

export function resolveDateRange(rangeDays: number): {
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (rangeDays - 1));

  return { startDate, endDate: now };
}

export function buildLogWhereInput({
  userId,
  startDate,
  endDate,
  flowIds,
  channels,
  statuses,
}: {
  userId: string;
  startDate: Date;
  endDate: Date;
  flowIds?: string[];
  channels?: string[];
  statuses?: string[];
}): Prisma.LogWhereInput {
  return {
    flow: {
      userId,
      ...(channels ? { channel: { in: channels } } : {}),
    },
    ...(flowIds ? { flowId: { in: flowIds } } : {}),
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
    ...(statuses ? { status: { in: statuses } } : {}),
  };
}
