import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contact = await prisma.contact.findFirst({
      where: { id: params.id, userId: auth.userId },
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
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, phone, tags: newTagNames = [] } = body;

    const contact = await prisma.contact.findFirst({
      where: { id: params.id, userId: auth.userId },
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
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contact = await prisma.contact.findFirst({
      where: { id: params.id, userId: auth.userId },
      select: { id: true },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.tagsOnContacts.deleteMany({
        where: { contactId: contact.id },
      }),
      prisma.session.deleteMany({ where: { contactId: contact.id } }),
      prisma.log.deleteMany({ where: { contactId: contact.id } }),
      prisma.broadcastRecipient.deleteMany({ where: { contactId: contact.id } }),
      prisma.contact.delete({
        where: { id: contact.id },
      }),
    ]);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`Error deleting contact ${params.id}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
