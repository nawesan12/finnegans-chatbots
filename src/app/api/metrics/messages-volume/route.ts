import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

type ChartPoint = {
  date: string;
  sent: number;
  received: number;
};

type FiltersResponse = {
  flows: { id: string; name: string; channel: string | null }[];
  channels: string[];
  statuses: string[];
};

const DEFAULT_RANGE_DAYS = 7;
const ALLOWED_RANGES = new Set([7, 14, 30, 90]);
const SENT_STATUSES = new Set(["Completed", "Sent", "Delivered", "Success"]);

function getRange(searchParams: URLSearchParams): number {
  const rangeParam = searchParams.get("range");
  if (!rangeParam) return DEFAULT_RANGE_DAYS;

  const parsed = Number(rangeParam);
  if (Number.isFinite(parsed) && ALLOWED_RANGES.has(parsed)) {
    return parsed;
  }

  return DEFAULT_RANGE_DAYS;
}

function normalizeStatuses(statusParam: string | null): string[] | undefined {
  if (!statusParam) return undefined;

  const statuses = statusParam
    .split(",")
    .map((status) => status.trim())
    .filter((status) => status.length > 0);

  return statuses.length ? statuses : undefined;
}

function createDateKey(date: Date): string {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized.toISOString();
}

function buildEmptyRange(startDate: Date, rangeDays: number): Record<string, ChartPoint> {
  const map: Record<string, ChartPoint> = {};
  const cursor = new Date(startDate);

  for (let index = 0; index < rangeDays; index += 1) {
    const key = createDateKey(cursor);
    map[key] = {
      date: key,
      sent: 0,
      received: 0,
    };
    cursor.setDate(cursor.getDate() + 1);
  }

  return map;
}

function groupLogsByDate(logs: { createdAt: Date; status: string }[]): Record<string, ChartPoint> {
  const buckets: Record<string, ChartPoint> = {};

  for (const log of logs) {
    const key = createDateKey(log.createdAt);
    if (!buckets[key]) {
      buckets[key] = {
        date: key,
        sent: 0,
        received: 0,
      };
    }

    if (SENT_STATUSES.has(log.status)) {
      buckets[key].sent += 1;
    } else {
      buckets[key].received += 1;
    }
  }

  return buckets;
}

function mergeBuckets(
  base: Record<string, ChartPoint>,
  additions: Record<string, ChartPoint>,
): ChartPoint[] {
  const merged: ChartPoint[] = [];

  for (const key of Object.keys(base)) {
    const basePoint = base[key];
    const addition = additions[key];

    if (addition) {
      merged.push({
        date: basePoint.date,
        sent: basePoint.sent + addition.sent,
        received: basePoint.received + addition.received,
      });
    } else {
      merged.push(basePoint);
    }
  }

  merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return merged;
}

export async function GET(request: Request) {
  const auth = getAuthPayload(request);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const rangeDays = getRange(searchParams);
    const flowId = searchParams.get("flowId") || undefined;
    const channel = searchParams.get("channel") || undefined;
    const statuses = normalizeStatuses(searchParams.get("status"));

    const now = new Date();
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (rangeDays - 1));

    const [logs, flows, distinctStatuses] = await Promise.all([
      prisma.log.findMany({
        where: {
          flow: {
            userId: auth.userId,
            ...(channel ? { channel } : {}),
            ...(flowId ? { id: flowId } : {}),
          },
          createdAt: {
            gte: startDate,
            lte: now,
          },
          ...(statuses ? { status: { in: statuses } } : {}),
        },
        select: {
          createdAt: true,
          status: true,
        },
      }),
      prisma.flow.findMany({
        where: { userId: auth.userId },
        select: {
          id: true,
          name: true,
          channel: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.log.findMany({
        where: { flow: { userId: auth.userId } },
        select: { status: true },
        distinct: ["status"],
      }),
    ]);

    const emptyBuckets = buildEmptyRange(startDate, rangeDays);
    const populatedBuckets = groupLogsByDate(logs);
    const data = mergeBuckets(emptyBuckets, populatedBuckets);

    const filters: FiltersResponse = {
      flows,
      channels: Array.from(new Set(flows.map((flow) => flow.channel).filter(Boolean))) as string[],
      statuses: distinctStatuses
        .map((entry) => entry.status)
        .filter((status): status is string => Boolean(status?.length))
        .sort((a, b) => a.localeCompare(b)),
    };

    return NextResponse.json({ data, filters });
  } catch (error) {
    console.error("Error fetching message volume:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
