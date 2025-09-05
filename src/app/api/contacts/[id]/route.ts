import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const contact = await prisma.contact.findUnique({
      where: { id: params.id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json(contact);
  } catch (error) {
    console.error(`Error fetching contact ${params.id}:`, error);
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
    const { name, phone, tags: newTagNames = [] } = body;

    const contact = await prisma.contact.findUnique({
      where: { id: params.id },
      include: { tags: { include: { tag: true } } },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const tagsToDisconnect = contact.tags
      .filter((t) => !newTagNames.includes(t.tag.name))
      .map((t) => ({ id: t.tag.id }));

    const tagsToConnectOrCreate = newTagNames.map((name: string) => ({
      where: { name },
      create: { name },
    }));

    const updatedContact = await prisma.contact.update({
      where: { id: params.id },
      data: {
        name,
        phone,
        tags: {
          disconnect: tagsToDisconnect,
          connectOrCreate: tagsToConnectOrCreate,
        },
      },
      include: {
        tags: { include: { tag: true } },
      },
    });

    return NextResponse.json(updatedContact);
  } catch (error) {
    console.error(`Error updating contact ${params.id}:`, error);
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
    // First, delete related TagsOnContacts entries
    await prisma.tagsOnContacts.deleteMany({
      where: { contactId: params.id },
    });

    // Then, delete the contact itself
    await prisma.contact.delete({
      where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`Error deleting contact ${params.id}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
