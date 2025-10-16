import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import {
  buildLogWhereInput,
  getRange,
  normalizeMultiValue,
  resolveDateRange,
} from "@/lib/dashboard/filters";
import {
  isReceivedLogStatus,
  isSentLogStatus,
} from "@/lib/dashboard/statuses";

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

    if (isSentLogStatus(log.status)) {
      buckets[key].sent += 1;
    } else if (isReceivedLogStatus(log.status)) {
      buckets[key].received += 1;
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
    const flowIds = normalizeMultiValue(searchParams.get("flowId"));
    const channels = normalizeMultiValue(searchParams.get("channel"));
    const statuses = normalizeMultiValue(searchParams.get("status"));

    const { startDate, endDate } = resolveDateRange(rangeDays);

    const logWhere = buildLogWhereInput({
      userId: auth.userId,
      startDate,
      endDate,
      flowIds,
      channels,
      statuses,
    });

    const [logs, flows, distinctStatuses] = await Promise.all([
      prisma.log.findMany({
        where: logWhere,
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
