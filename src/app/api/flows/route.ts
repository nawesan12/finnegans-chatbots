import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const flows = await prisma.flow.findMany({
      orderBy: {
        updatedAt: "desc",
      },
    });
    return NextResponse.json(flows);
  } catch (error) {
    console.error("Error fetching flows:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, trigger, status, definition, userId } = body;

    if (!name || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const newFlow = await prisma.flow.create({
      data: {
        name,
        trigger: trigger || "default",
        status: status || "Draft",
        definition: definition || {},
        user: { connect: { id: userId } },
      },
    });

    return NextResponse.json(newFlow, { status: 201 });
  } catch (error) {
    console.error("Error creating flow:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
