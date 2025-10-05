import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { formatContactsAsCsv } from "@/lib/contacts";

const MAX_SEARCH_LENGTH = 200;

export async function GET(request: Request) {
  const auth = getAuthPayload(request);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawSearch = searchParams.get("search");
  const tagId = searchParams.get("tagId");

  const searchTerm = rawSearch?.trim();

  if (searchTerm && searchTerm.length > MAX_SEARCH_LENGTH) {
    return NextResponse.json(
      { error: "El término de búsqueda es demasiado extenso." },
      { status: 400 },
    );
  }

  const conditions: Prisma.ContactWhereInput[] = [{ userId: auth.userId }];

  if (tagId && tagId !== "all") {
    conditions.push({ tags: { some: { tagId } } });
  }

  if (searchTerm) {
    const contains: Prisma.StringFilter = {
      contains: searchTerm,
      mode: "insensitive",
    };

    conditions.push({
      OR: [
        { name: contains },
        { phone: contains },
        { notes: contains },
        { tags: { some: { tag: { name: contains } } } },
      ],
    });
  }

  const where =
    conditions.length === 1 ? conditions[0] : ({ AND: conditions } satisfies Prisma.ContactWhereInput);

  try {
    const contacts = await prisma.contact.findMany({
      where,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const csv = formatContactsAsCsv(contacts);
    const filename = `contacts-${new Date().toISOString().split("T")[0]}.csv`;

    const headers = new Headers({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    });

    return new NextResponse(csv, { status: 200, headers });
  } catch (error) {
    console.error("Failed to export contacts", error);
    return NextResponse.json(
      { error: "No pudimos exportar los contactos. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
