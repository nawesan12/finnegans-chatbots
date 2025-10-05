import prisma from "@/lib/prisma";
import { GRAPH_VERSION, META_API_TIMEOUT_MS } from "@/lib/meta";

export class MetaTemplateError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, options?: { status?: number; details?: unknown }) {
    super(message);
    this.name = "MetaTemplateError";
    if (options?.status) {
      this.status = options.status;
    }
    if (options?.details !== undefined) {
      this.details = options.details;
    }
  }
}

type MetaTemplateCredentials = { accessToken: string; wabaId: string };

type RawTemplate = Record<string, unknown>;

type RawTemplateComponent = Record<string, unknown>;

type RawTemplateResponse = {
  data?: unknown;
  paging?: { next?: unknown };
};

export type MetaTemplateComponent = {
  type: string;
  subType?: string | null;
  index?: number | null;
  text?: string | null;
  example?: Record<string, unknown> | null;
  buttons?: Array<Record<string, unknown>> | null;
};

export type MetaTemplate = {
  id: string;
  name: string;
  language: string;
  status: string | null;
  category?: string | null;
  components: MetaTemplateComponent[];
};

const ensureCredentials = async (
  userId: string,
): Promise<MetaTemplateCredentials> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      metaAccessToken: true,
      metaBusinessAccountId: true,
    },
  });

  const accessToken = user?.metaAccessToken?.trim() ?? "";
  const wabaId = user?.metaBusinessAccountId?.trim() ?? "";

  if (!accessToken || !wabaId) {
    throw new MetaTemplateError(
      "Missing Meta credentials. Configure Access Token and Business Account ID in Settings.",
      { status: 400 },
    );
  }

  return { accessToken, wabaId };
};

const toNullableRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const sanitizeComponent = (
  input: unknown,
): MetaTemplateComponent | null => {
  const record = toNullableRecord(input);
  if (!record) return null;

  const type = typeof record.type === "string" ? record.type : "";
  if (!type.trim()) return null;

  const subType =
    typeof record.sub_type === "string"
      ? record.sub_type
      : typeof record.subType === "string"
        ? record.subType
        : null;

  const indexRaw = record.index;
  let index: number | null = null;
  if (typeof indexRaw === "number" && Number.isFinite(indexRaw)) {
    index = indexRaw;
  } else if (typeof indexRaw === "string") {
    const parsed = Number(indexRaw);
    if (Number.isFinite(parsed)) {
      index = parsed;
    }
  }

  const text = typeof record.text === "string" ? record.text : null;
  const example = toNullableRecord(record.example);

  let buttons: Array<Record<string, unknown>> | null = null;
  if (Array.isArray(record.buttons)) {
    buttons = record.buttons
      .map((btn) => toNullableRecord(btn))
      .filter((btn): btn is Record<string, unknown> => !!btn);
  }

  return {
    type,
    subType: subType ?? null,
    index,
    text,
    example,
    buttons,
  };
};

const sanitizeTemplate = (input: unknown): MetaTemplate | null => {
  const record = toNullableRecord(input);
  if (!record) return null;

  const id = typeof record.id === "string" ? record.id : null;
  const name = typeof record.name === "string" ? record.name : null;
  const language = typeof record.language === "string" ? record.language : null;

  if (!id || !name || !language) {
    return null;
  }

  const status = typeof record.status === "string" ? record.status : null;
  const category = typeof record.category === "string" ? record.category : null;
  const componentsRaw = Array.isArray(record.components)
    ? (record.components as RawTemplateComponent[])
    : [];
  const components = componentsRaw
    .map((component) => sanitizeComponent(component))
    .filter((component): component is MetaTemplateComponent => !!component);

  return {
    id,
    name,
    language,
    status,
    category,
    components,
  };
};

const fetchTemplatesPage = async (
  url: string,
  accessToken: string,
): Promise<{ templates: MetaTemplate[]; next: string | null }> => {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
  } as Record<string, string>;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), META_API_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    const raw = await response.text();
    let json: RawTemplateResponse | null = null;
    if (raw) {
      try {
        json = JSON.parse(raw) as RawTemplateResponse;
      } catch {
        json = null;
      }
    }

    if (!response.ok) {
      const errorMessage =
        (json &&
          typeof json === "object" &&
          json &&
          typeof (json as Record<string, unknown>).error === "object" &&
          (json as Record<string, { error?: { message?: string; error_user_msg?: string } }>).error
            ?.error_user_msg) ||
        (json &&
          typeof json === "object" &&
          json &&
          typeof (json as Record<string, unknown>).error === "object" &&
          (json as Record<string, { error?: { message?: string } }>).error?.message) ||
        response.statusText ||
        "Meta template API request failed";

      throw new MetaTemplateError(errorMessage, {
        status: response.status,
        details: json ?? raw,
      });
    }

    const dataEntries = Array.isArray(json?.data) ? (json?.data as RawTemplate[]) : [];
    const templates = dataEntries
      .map((entry) => sanitizeTemplate(entry))
      .filter((entry): entry is MetaTemplate => !!entry);

    const nextRaw = json?.paging?.next;
    const next = typeof nextRaw === "string" && nextRaw.trim() ? nextRaw : null;

    return { templates, next };
  } catch (error) {
    if (error instanceof MetaTemplateError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new MetaTemplateError("Meta template API request timed out", {
        status: 504,
      });
    }
    throw new MetaTemplateError("Meta template API request failed", {
      details: error,
    });
  } finally {
    clearTimeout(timeout);
  }
};

export const fetchMetaTemplates = async (
  userId: string,
): Promise<MetaTemplate[]> => {
  const { accessToken, wabaId } = await ensureCredentials(userId);
  let nextUrl: string | null = `https://graph.facebook.com/${GRAPH_VERSION}/${wabaId}/message_templates?limit=100`;
  const templates: MetaTemplate[] = [];
  const seen = new Set<string>();

  while (nextUrl) {
    const { templates: pageTemplates, next } = await fetchTemplatesPage(
      nextUrl,
      accessToken,
    );
    for (const template of pageTemplates) {
      if (seen.has(template.id)) continue;
      seen.add(template.id);
      templates.push(template);
    }
    nextUrl = next;
  }

  return templates;
};
