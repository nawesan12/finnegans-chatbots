import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const contacts = await prisma.contact.findMany({
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });
    return NextResponse.json(contacts);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, userId, tags } = body;

    // Basic validation
    if (!name || !phone || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const newContact = await prisma.contact.create({
      data: {
        name,
        phone,
        user: { connect: { id: userId } },
        tags: tags
          ? {
              create: tags.map((tag: { name: string }) => ({
                tag: {
                  connectOrCreate: {
                    where: { name: tag.name },
                    create: { name: tag.name },
                  },
                },
              })),
            }
          : undefined,
      },
      include: {
        tags: { include: { tag: true } },
      },
    });

    return NextResponse.json(newContact, { status: 201 });
  } catch (error) {
    console.error("Error creating contact:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
