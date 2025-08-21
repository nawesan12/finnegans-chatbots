import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contacts, userId } = body;

    if (!Array.isArray(contacts) || !userId) {
      return NextResponse.json(
        { error: "Missing required fields or invalid format" },
        { status: 400 }
      );
    }

    const createdContacts = await prisma.$transaction(
      contacts.map((contact) =>
        prisma.contact.create({
          data: {
            name: contact.name,
            phone: contact.phone,
            user: { connect: { id: userId } },
            tags: contact.tags
              ? {
                  create: contact.tags.map((tag: string) => ({
                    tag: {
                      connectOrCreate: {
                        where: { name: tag },
                        create: { name: tag },
                      },
                    },
                  })),
                }
              : undefined,
          },
        })
      )
    );

    return NextResponse.json(
      { message: `${createdContacts.length} contacts imported successfully.` },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error importing contacts:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
