import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contacts = await prisma.contact.findMany({
      where: { userId: auth.userId },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
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
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const tags = Array.isArray(body?.tags) ? body.tags : [];

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 },
      );
    }

    const normalizedTags = tags
      .map((tag: unknown) => {
        if (typeof tag === "string") {
          return tag.trim();
        }
        if (typeof tag === "object" && tag !== null && "name" in tag) {
          return String((tag as { name: unknown }).name).trim();
        }
        return "";
      })
      .filter((tagName: string): tagName is string => tagName.length > 0);

    const uniqueTagNames: string[] = Array.from(new Set(normalizedTags));

    const tagRelations = uniqueTagNames.map((tagName) => ({
      tag: {
        connectOrCreate: {
          where: { name: tagName } satisfies Prisma.TagWhereUniqueInput,
          create: { name: tagName },
        },
      },
    }));

    const newContact = await prisma.contact.create({
      data: {
        name: name || null,
        phone,
        user: { connect: { id: auth.userId } },
        tags:
          tagRelations.length > 0
            ? {
                create: tagRelations,
              }
            : undefined,
      },
      include: {
        tags: { include: { tag: true } },
      },
    });

    return NextResponse.json(newContact, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A contact with that phone already exists" },
        { status: 409 },
      );
    }
    console.error("Error creating contact:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
