import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
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
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const hasName = Object.prototype.hasOwnProperty.call(body, "name");
    const hasPhone = Object.prototype.hasOwnProperty.call(body, "phone");
    const hasTags = Object.prototype.hasOwnProperty.call(body, "tags");
    const hasNotes = Object.prototype.hasOwnProperty.call(body, "notes");

    let name: string | null | undefined = undefined;
    if (hasName) {
      if (typeof body?.name === "string") {
        const trimmed = body.name.trim();
        name = trimmed ? trimmed : null;
      } else if (body?.name === null) {
        name = null;
      } else {
        name = null;
      }
    }

    let phone: string | undefined = undefined;
    if (hasPhone) {
      if (typeof body?.phone !== "string") {
        return NextResponse.json(
          { error: "Phone number must be a string" },
          { status: 400 },
        );
      }
      const trimmed = body.phone.trim();
      if (!trimmed) {
        return NextResponse.json(
          { error: "Phone number is required" },
          { status: 400 },
        );
      }
      phone = trimmed;
    }

    let normalizedTags: string[] | undefined;
    if (hasTags) {
      if (!Array.isArray(body?.tags)) {
        return NextResponse.json(
          { error: "Tags must be an array" },
          { status: 400 },
        );
      }
      normalizedTags = body.tags
        .map((tag: unknown) => {
          if (typeof tag === "string") return tag.trim();
          if (typeof tag === "object" && tag !== null && "name" in tag) {
            return String((tag as { name: unknown }).name).trim();
          }
          return "";
        })
        .filter((tagName: string): tagName is string => tagName.length > 0);
    }

    let notes: string | null | undefined = undefined;
    if (hasNotes) {
      if (typeof body?.notes === "string") {
        const trimmed = body.notes.trim();
        notes = trimmed ? trimmed : null;
      } else if (body?.notes === null) {
        notes = null;
      } else {
        notes = null;
      }
    }

    const contact = await prisma.contact.findFirst({
      where: { id: params.id, userId: auth.userId },
      include: { tags: { include: { tag: true } } },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const updateData: Prisma.ContactUpdateInput = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (phone !== undefined) {
      updateData.phone = phone;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (normalizedTags !== undefined) {
      const uniqueTagNames = Array.from(new Set(normalizedTags));

      const tagsToDisconnect: Prisma.TagsOnContactsWhereUniqueInput[] =
        contact.tags
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

      if (tagsToDisconnect.length || tagsToCreate.length) {
        const tagsUpdate: Prisma.TagsOnContactsUpdateManyWithoutContactNestedInput =
          {};
        if (tagsToDisconnect.length) {
          tagsUpdate.disconnect = tagsToDisconnect;
        }
        if (tagsToCreate.length) {
          tagsUpdate.create = tagsToCreate;
        }
        updateData.tags = tagsUpdate;
      }
    }

    const hasUpdates =
      updateData.name !== undefined ||
      updateData.phone !== undefined ||
      updateData.notes !== undefined ||
      updateData.tags !== undefined;

    if (!hasUpdates) {
      return NextResponse.json(contact);
    }

    const updatedContact = await prisma.contact.update({
      where: { id: params.id },
      data: updateData,
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
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
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
