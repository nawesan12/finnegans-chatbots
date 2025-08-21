import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const totalContacts = await prisma.contact.count();
    const totalFlows = await prisma.flow.count();
    const totalLogs = await prisma.log.count();
    const activeFlows = await prisma.flow.count({
        where: { status: 'Active' }
    });

    // Placeholder for more complex metrics
    const messagesSent = totalLogs * 5;
    const messagesReceived = totalLogs * 4;
    const avgResponseTime = "N/A";
    const flowSuccessRate = "N/A";


    const metrics = {
      totalContacts,
      activeConversations: activeFlows, // Placeholder
      messagesSent, // Placeholder
      messagesReceived, // Placeholder
      avgResponseTime, // Placeholder
      flowSuccessRate, // Placeholder
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
