import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { formatLeadsAsCsv } from "@/lib/leads";

const MAX_SEARCH_LENGTH = 200;

export async function GET(request: Request) {
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status")?.trim();
  const searchTerm = searchParams.get("search")?.trim();

  if (searchTerm && searchTerm.length > MAX_SEARCH_LENGTH) {
    return NextResponse.json(
      { error: "El término de búsqueda es demasiado extenso." },
      { status: 400 },
    );
  }

  const where: Prisma.LeadWhereInput = {};

  if (statusFilter) {
    where.status = statusFilter;
  }

  if (searchTerm) {
    const contains: Prisma.StringFilter = {
      contains: searchTerm,
      mode: "insensitive",
    };

    where.OR = [
      { name: contains },
      { email: contains },
      { company: contains },
      { phone: contains },
      { message: contains },
      { notes: contains },
    ];
  }

  try {
    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const csv = formatLeadsAsCsv(leads);
    const filename = `leads-${new Date().toISOString().split("T")[0]}.csv`;

    const headers = new Headers({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    });

    return new NextResponse(csv, { status: 200, headers });
  } catch (error) {
    console.error("Failed to export leads", error);
    return NextResponse.json(
      { error: "No pudimos exportar los leads. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
