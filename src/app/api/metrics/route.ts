import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId } = payload;

    const [
      totalContacts,
      totalFlows,
      activeConversations,
      totalSessions,
      completedSessions,
      totalLogs,
    ] = await Promise.all([
      prisma.contact.count({ where: { userId } }),
      prisma.flow.count({ where: { userId } }),
      prisma.session.count({
        where: {
          flow: { userId },
          status: { notIn: ["Completed", "Errored"] },
        },
      }),
      prisma.session.count({
        where: {
          flow: { userId },
        },
      }),
      prisma.session.count({
        where: {
          flow: { userId },
          status: "Completed",
        },
      }),
      prisma.log.count({
        where: {
          flow: { userId },
        },
      }),
    ]);

    const flowSuccessRate =
      totalSessions > 0
        ? Number(((completedSessions / totalSessions) * 100).toFixed(1))
        : 0;

    const metrics = {
      totalContacts,
      totalFlows,
      activeConversations,
      messagesSent: totalLogs,
      flowSuccessRate,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
