import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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
    const name = typeof body?.name === "string" ? body.name.trim() : undefined;
    const phone = typeof body?.phone === "string" ? body.phone.trim() : undefined;
    const incomingTags = Array.isArray(body?.tags) ? body.tags : [];
    const normalizedTags = incomingTags
      .map((tag: unknown) => {
        if (typeof tag === "string") return tag.trim();
        if (typeof tag === "object" && tag !== null && "name" in tag) {
          return String((tag as { name: unknown }).name).trim();
        }
        return "";
      })
      .filter((tagName: string): tagName is string => tagName.length > 0);
    const uniqueTagNames: string[] = Array.from(new Set(normalizedTags));

    const contact = await prisma.contact.findFirst({
      where: { id: params.id, userId: auth.userId },
      include: { tags: { include: { tag: true } } },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const tagsToDisconnect: Prisma.TagsOnContactsWhereUniqueInput[] = contact.tags
      .filter((t) => !uniqueTagNames.includes(t.tag.name))
      .map((t) => ({
        contactId_tagId: {
          contactId: contact.id,
          tagId: t.tag.id,
        },
      }));

    const existingTagNames = new Set(contact.tags.map((t) => t.tag.name));
    const tagsToAdd = uniqueTagNames.filter(
      (tagName) => !existingTagNames.has(tagName),
    );
    const tagsToCreate: Prisma.TagsOnContactsCreateWithoutContactInput[] =
      tagsToAdd.map((tagName) => ({
        tag: {
          connectOrCreate: {
            where: { name: tagName } satisfies Prisma.TagWhereUniqueInput,
            create: { name: tagName },
          },
        },
      }));

    const updatedContact = await prisma.contact.update({
      where: { id: params.id },
      data: {
        name: name || null,
        phone: phone || contact.phone,
        tags: {
          disconnect: tagsToDisconnect.length ? tagsToDisconnect : undefined,
          create: tagsToCreate.length ? tagsToCreate : undefined,
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
