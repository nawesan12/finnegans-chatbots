import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const flow = await prisma.flow.findUnique({
      where: { id: params.id },
    });

    if (!flow) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    }

    return NextResponse.json(flow);
  } catch (error) {
    console.error(`Error fetching flow ${params.id}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, trigger, status, definition } = body;

    const updatedFlow = await prisma.flow.update({
      where: { id: params.id },
      data: {
        name,
        trigger,
        status,
        definition,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedFlow);
  } catch (error) {
    console.error(`Error updating flow ${params.id}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Delete related logs first
    await prisma.log.deleteMany({
        where: { flowId: params.id }
    });

    // Then delete the flow
    await prisma.flow.delete({
      where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`Error deleting flow ${params.id}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
