import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { formatLeadsAsCsv } from "@/lib/leads";

const MAX_SEARCH_LENGTH = 200;

type DateParseResult =
  | { ok: true; value: Date | null }
  | { ok: false; message: string };

function parseDateParam(
  label: string,
  value: string | null,
  { endOfDay = false }: { endOfDay?: boolean } = {},
): DateParseResult {
  if (!value) {
    return { ok: true, value: null };
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return {
      ok: false,
      message: `El formato de ${label} no es válido. Usa AAAA-MM-DD.`,
    };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return {
      ok: false,
      message: `No pudimos interpretar ${label}. Revisa el valor ingresado.`,
    };
  }

  const date = new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return {
      ok: false,
      message: `El valor de ${label} no corresponde a una fecha válida.`,
    };
  }

  return { ok: true, value: date };
}

export async function GET(request: Request) {
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status")?.trim();
  const searchTerm = searchParams.get("search")?.trim();
  const createdFromParam = searchParams.get("createdFrom");
  const createdToParam = searchParams.get("createdTo");

  if (searchTerm && searchTerm.length > MAX_SEARCH_LENGTH) {
    return NextResponse.json(
      { error: "El término de búsqueda es demasiado extenso." },
      { status: 400 },
    );
  }

  const parsedFrom = parseDateParam("la fecha inicial", createdFromParam);
  if (!parsedFrom.ok) {
    return NextResponse.json(
      { error: parsedFrom.message },
      { status: 400 },
    );
  }

  const parsedTo = parseDateParam("la fecha final", createdToParam, {
    endOfDay: true,
  });
  if (!parsedTo.ok) {
    return NextResponse.json({ error: parsedTo.message }, { status: 400 });
  }

  const createdFrom = parsedFrom.value;
  const createdTo = parsedTo.value;

  if (createdFrom && createdTo && createdFrom > createdTo) {
    return NextResponse.json(
      {
        error: "La fecha inicial no puede ser posterior a la fecha final.",
      },
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
      { focusArea: contains },
    ];
  }

  if (createdFrom || createdTo) {
    where.createdAt = {
      ...(createdFrom ? { gte: createdFrom } : {}),
      ...(createdTo ? { lte: createdTo } : {}),
    };
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
