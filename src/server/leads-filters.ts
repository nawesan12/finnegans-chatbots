import type { Prisma } from "@prisma/client";

export const LEAD_FOCUS_AREA_NONE_QUERY_VALUE = "none";
export const LEAD_FILTER_MAX_SEARCH_LENGTH = 200;

export type DateParseResult =
  | { ok: true; value: Date | null }
  | { ok: false; message: string };

export function parseDateParam(
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

export type ParsedLeadFilters = {
  status?: string;
  focusArea?: string | null;
  search?: string | null;
  createdFrom?: Date | null;
  createdTo?: Date | null;
};

export type LeadFilterParseResult =
  | { ok: true; filters: ParsedLeadFilters; where: Prisma.LeadWhereInput }
  | { ok: false; message: string; status: number };

const MAX_TEXT_FILTER_LENGTH = 180;

function sanitizeTextFilter(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.length > MAX_TEXT_FILTER_LENGTH
    ? trimmed.slice(0, MAX_TEXT_FILTER_LENGTH)
    : trimmed;
}

export function parseLeadFilters(
  searchParams: URLSearchParams,
): LeadFilterParseResult {
  const statusRaw = sanitizeTextFilter(searchParams.get("status"));
  const status = statusRaw && statusRaw !== "all" ? statusRaw : undefined;

  const focusAreaRaw = sanitizeTextFilter(searchParams.get("focusArea"));
  let focusArea: string | null | undefined = undefined;
  if (focusAreaRaw) {
    if (focusAreaRaw === "all") {
      focusArea = undefined;
    } else if (focusAreaRaw === LEAD_FOCUS_AREA_NONE_QUERY_VALUE) {
      focusArea = null;
    } else {
      focusArea = focusAreaRaw;
    }
  }

  const search = sanitizeTextFilter(searchParams.get("search"));
  if (search && search.length > LEAD_FILTER_MAX_SEARCH_LENGTH) {
    return {
      ok: false,
      status: 400,
      message: "El término de búsqueda es demasiado extenso.",
    };
  }

  const createdFromParam = searchParams.get("createdFrom");
  const createdToParam = searchParams.get("createdTo");

  const parsedFrom = parseDateParam("la fecha inicial", createdFromParam);
  if (!parsedFrom.ok) {
    return { ok: false, status: 400, message: parsedFrom.message };
  }

  const parsedTo = parseDateParam("la fecha final", createdToParam, {
    endOfDay: true,
  });
  if (!parsedTo.ok) {
    return { ok: false, status: 400, message: parsedTo.message };
  }

  const createdFrom = parsedFrom.value;
  const createdTo = parsedTo.value;

  if (createdFrom && createdTo && createdFrom > createdTo) {
    return {
      ok: false,
      status: 400,
      message: "La fecha inicial no puede ser posterior a la fecha final.",
    };
  }

  const filters: ParsedLeadFilters = {
    status,
    focusArea,
    search,
    createdFrom,
    createdTo,
  };

  const where: Prisma.LeadWhereInput = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.focusArea !== undefined) {
    where.focusArea = filters.focusArea;
  }

  if (filters.createdFrom || filters.createdTo) {
    where.createdAt = {
      ...(filters.createdFrom ? { gte: filters.createdFrom } : {}),
      ...(filters.createdTo ? { lte: filters.createdTo } : {}),
    };
  }

  if (filters.search) {
    const contains: Prisma.StringFilter = {
      contains: filters.search,
      mode: "insensitive",
    };

    const searchCondition: Prisma.LeadWhereInput = {
      OR: [
        { name: contains },
        { email: contains },
        { company: contains },
        { phone: contains },
        { message: contains },
        { notes: contains },
        { focusArea: contains },
      ],
    };

    if (Array.isArray(where.AND) && where.AND.length > 0) {
      where.AND = [...where.AND, searchCondition];
    } else if (Object.keys(where).length > 0) {
      where.AND = [searchCondition];
    } else {
      Object.assign(where, searchCondition);
    }
  }

  return { ok: true, filters, where };
}
