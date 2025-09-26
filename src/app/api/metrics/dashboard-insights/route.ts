import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import {
  buildLogWhereInput,
  getRange,
  normalizeMultiValue,
  resolveDateRange,
} from "@/lib/dashboard/filters";

const SENT_STATUSES = new Set(["Completed", "Sent", "Delivered", "Success"]);
const SESSION_STATUSES = new Set(["Active", "Paused", "Completed", "Errored"]);

function formatChannelLabel(channel: string | null): string {
  if (!channel) {
    return "Sin canal";
  }

  const trimmed = channel.trim();
  if (!trimmed.length) {
    return "Sin canal";
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
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

    const sessionStatusFilter = statuses?.filter((status) =>
      SESSION_STATUSES.has(status),
    );

    const [logs, sessions] = await Promise.all([
      prisma.log.findMany({
        where: logWhere,
        select: {
          status: true,
          flow: {
            select: {
              id: true,
              name: true,
              channel: true,
            },
          },
        },
      }),
      prisma.session.findMany({
        where: {
          flow: {
            userId: auth.userId,
            ...(channels ? { channel: { in: channels } } : {}),
          },
          ...(flowIds ? { flowId: { in: flowIds } } : {}),
          ...(sessionStatusFilter && sessionStatusFilter.length
            ? { status: { in: sessionStatusFilter } }
            : {}),
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          status: true,
          flowId: true,
          flow: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    const channelMap = new Map<
      string,
      { channel: string; sent: number; received: number; total: number }
    >();

    for (const log of logs) {
      const channelLabel = formatChannelLabel(log.flow?.channel ?? null);
      const entry = channelMap.get(channelLabel);

      if (entry) {
        if (SENT_STATUSES.has(log.status)) {
          entry.sent += 1;
        } else {
          entry.received += 1;
        }
        entry.total = entry.sent + entry.received;
      } else {
        const sent = SENT_STATUSES.has(log.status) ? 1 : 0;
        const received = sent ? 0 : 1;
        channelMap.set(channelLabel, {
          channel: channelLabel,
          sent,
          received,
          total: sent + received,
        });
      }
    }

    const channelDistribution = Array.from(channelMap.values()).sort(
      (a, b) => b.total - a.total,
    );

    const statusMap = new Map<string, number>();
    for (const log of logs) {
      const statusLabel = log.status?.trim().length
        ? log.status
        : "Sin estado";
      statusMap.set(statusLabel, (statusMap.get(statusLabel) ?? 0) + 1);
    }

    const statusBreakdown = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    const flowMap = new Map<
      string,
      {
        flowId: string;
        flowName: string;
        completed: number;
        errored: number;
        total: number;
      }
    >();

    for (const session of sessions) {
      const flowId = session.flowId;
      const flowName = session.flow?.name?.trim().length
        ? session.flow?.name ?? "Flujo sin nombre"
        : "Flujo sin nombre";

      const existing = flowMap.get(flowId);
      if (existing) {
        existing.total += 1;
        if (session.status === "Completed") {
          existing.completed += 1;
        } else if (session.status === "Errored") {
          existing.errored += 1;
        }
      } else {
        flowMap.set(flowId, {
          flowId,
          flowName,
          total: 1,
          completed: session.status === "Completed" ? 1 : 0,
          errored: session.status === "Errored" ? 1 : 0,
        });
      }
    }

    const flowPerformance = Array.from(flowMap.values())
      .map((entry) => ({
        ...entry,
        successRate:
          entry.total > 0
            ? Number(((entry.completed / entry.total) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return NextResponse.json({
      channelDistribution,
      flowPerformance,
      statusBreakdown,
    });
  } catch (error) {
    console.error("Error fetching dashboard insights:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
