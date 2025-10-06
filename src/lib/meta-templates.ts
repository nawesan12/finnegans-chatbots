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

export type CreateMetaTemplateButton = {
  type: string;
  text?: string | null;
  url?: string | null;
  phoneNumber?: string | null;
  example?: Record<string, unknown> | null;
};

export type CreateMetaTemplateComponent = {
  type: string;
  format?: string | null;
  subType?: string | null;
  text?: string | null;
  example?: Record<string, unknown> | null;
  buttons?: CreateMetaTemplateButton[] | null;
};

export type CreateMetaTemplatePayload = {
  name: string;
  category: string;
  language: string;
  allowCategoryChange?: boolean | null;
  components?: CreateMetaTemplateComponent[] | null;
};

export type CreateMetaTemplateResult = {
  id: string;
  raw: unknown;
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

const normalizeUpper = (value?: string | null) => {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed.toUpperCase() : "";
};

const sanitizeCreateButton = (
  input: CreateMetaTemplateButton | null | undefined,
): Record<string, unknown> | null => {
  if (!input) return null;

  const type = normalizeUpper(input.type);
  if (!type) return null;

  const result: Record<string, unknown> = { type };

  const text = (input.text ?? "").toString().trim();
  if (text) {
    result.text = text;
  }

  const url = (input.url ?? "").toString().trim();
  if (url) {
    result.url = url;
  }

  const phoneNumber = (input.phoneNumber ?? "").toString().trim();
  if (phoneNumber) {
    result.phone_number = phoneNumber;
  }

  const example = toNullableRecord(input.example ?? null);
  if (example && Object.keys(example).length > 0) {
    result.example = example;
  }

  return result;
};

const sanitizeCreateComponent = (
  input: CreateMetaTemplateComponent | null | undefined,
): Record<string, unknown> | null => {
  if (!input) return null;

  const type = normalizeUpper(input.type);
  if (!type) return null;

  const result: Record<string, unknown> = { type };

  const format = normalizeUpper(input.format ?? null);
  if (format) {
    result.format = format;
  }

  const subType = normalizeUpper(input.subType ?? null);
  if (subType) {
    result.sub_type = subType;
  }

  const text = (input.text ?? "").toString().trim();
  if (text) {
    result.text = text;
  }

  const example = toNullableRecord(input.example ?? null);
  if (example && Object.keys(example).length > 0) {
    result.example = example;
  }

  if (Array.isArray(input.buttons)) {
    const buttons = input.buttons
      .map((button) => sanitizeCreateButton(button))
      .filter((button): button is Record<string, unknown> => !!button);
    if (buttons.length) {
      result.buttons = buttons;
    }
  }

  return result;
};

const buildCreateTemplateBody = (
  payload: CreateMetaTemplatePayload,
): Record<string, unknown> => {
  const name = (payload.name ?? "").trim();
  if (!name) {
    throw new MetaTemplateError("Template name is required", { status: 400 });
  }

  const language = (payload.language ?? "").trim();
  if (!language) {
    throw new MetaTemplateError("Template language is required", { status: 400 });
  }

  const category = normalizeUpper(payload.category ?? "");
  if (!category) {
    throw new MetaTemplateError("Template category is required", { status: 400 });
  }

  const body: Record<string, unknown> = {
    name,
    category,
    language,
  };

  if (payload.allowCategoryChange) {
    body.allow_category_change = true;
  }

  const components = Array.isArray(payload.components)
    ? payload.components
        .map((component) => sanitizeCreateComponent(component))
        .filter((component): component is Record<string, unknown> => !!component)
    : [];

  if (components.length) {
    body.components = components;
  }

  return body;
};

const performTemplateRequest = async (
  url: string,
  accessToken: string,
  method: "POST" | "DELETE",
  body?: Record<string, unknown>,
): Promise<{ json: unknown }> => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), META_API_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });

    const raw = await response.text();
    let json: unknown = null;
    if (raw) {
      try {
        json = JSON.parse(raw);
      } catch {
        json = raw;
      }
    }

    if (!response.ok) {
      const errorMessage =
        (json &&
          typeof json === "object" &&
          (json as { error?: { message?: string; error_user_msg?: string } }).error
            ?.error_user_msg) ||
        (json &&
          typeof json === "object" &&
          (json as { error?: { message?: string } }).error?.message) ||
        response.statusText ||
        "Meta template API request failed";

      throw new MetaTemplateError(errorMessage, {
        status: response.status,
        details: json ?? raw,
      });
    }

    return { json };
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

export const createMetaTemplate = async (
  userId: string,
  payload: CreateMetaTemplatePayload,
): Promise<CreateMetaTemplateResult> => {
  const { accessToken, wabaId } = await ensureCredentials(userId);
  const body = buildCreateTemplateBody(payload);
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${wabaId}/message_templates`;
  const { json } = await performTemplateRequest(url, accessToken, "POST", body);

  const id =
    (json &&
      typeof json === "object" &&
      (json as Record<string, unknown>).id &&
      typeof (json as Record<string, unknown>).id === "string"
      ? ((json as Record<string, unknown>).id as string).trim()
      : null) || null;

  if (!id) {
    throw new MetaTemplateError("Meta template response missing id", {
      status: 502,
      details: json,
    });
  }

  return { id, raw: json };
};

export const deleteMetaTemplate = async (
  userId: string,
  templateId: string,
): Promise<void> => {
  const { accessToken } = await ensureCredentials(userId);
  const trimmedId = templateId?.trim();

  if (!trimmedId) {
    throw new MetaTemplateError("Template id is required", { status: 400 });
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${trimmedId}`;
  await performTemplateRequest(url, accessToken, "DELETE");
};
