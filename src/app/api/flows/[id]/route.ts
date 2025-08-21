import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, JsonValue } from '@/generated/prisma';
import { getUserIdFromToken } from '@/lib/auth';
import { z } from 'zod';

const prisma = new PrismaClient();

const updateFlowSchema = z.object({
  name: z.string().optional(),
  trigger: z.string().optional(),
  status: z.string().optional(),
  definition: z.custom<JsonValue>().optional(),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const flow = await prisma.flow.findFirst({
      where: {
        id: params.id,
        userId,
      },
    });

    if (!flow) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
    }

    return NextResponse.json(flow);
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, trigger, status, definition } = updateFlowSchema.parse(body);

    const flow = await prisma.flow.updateMany({
      where: {
        id: params.id,
        userId,
      },
      data: {
        name,
        trigger,
        status,
        definition,
      },
    });

    if (flow.count === 0) {
      return NextResponse.json({ error: 'Flow not found or user not authorized' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Flow updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const flow = await prisma.flow.deleteMany({
      where: {
        id: params.id,
        userId,
      },
    });

    if (flow.count === 0) {
      return NextResponse.json({ error: 'Flow not found or user not authorized' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Flow deleted successfully' });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
