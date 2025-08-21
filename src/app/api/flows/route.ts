import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { getUserIdFromToken } from '@/lib/auth';
import { z } from 'zod';

const prisma = new PrismaClient();

const createFlowSchema = z.object({
  name: z.string(),
  trigger: z.string(),
  definition: z.any().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const flows = await prisma.flow.findMany({
      where: {
        userId,
      },
    });

    return NextResponse.json(flows);
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, trigger, definition } = createFlowSchema.parse(body);

    const flow = await prisma.flow.create({
      data: {
        name,
        trigger,
        definition,
        userId,
      },
    });

    return NextResponse.json(flow, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
