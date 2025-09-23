import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const take = limitParam ? Math.min(Number(limitParam) || 0, 50) : undefined;

    const logs = await prisma.log.findMany({
      where: { flow: { userId: auth.userId } },
      orderBy: { createdAt: "desc" },
      take: take && take > 0 ? take : undefined,
      include: {
        contact: true,
        flow: true,
      },
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
