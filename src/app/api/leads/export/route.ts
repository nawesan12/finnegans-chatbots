import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { formatLeadsAsCsv } from "@/lib/leads";
import { parseLeadFilters } from "@/server/leads-filters";

export async function GET(request: Request) {
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsedFilters = parseLeadFilters(searchParams);

  if (!parsedFilters.ok) {
    return NextResponse.json(
      { error: parsedFilters.message },
      { status: parsedFilters.status },
    );
  }

  const where =
    Object.keys(parsedFilters.where).length > 0
      ? parsedFilters.where
      : undefined;

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
