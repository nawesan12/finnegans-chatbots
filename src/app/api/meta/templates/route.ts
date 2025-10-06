import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthPayload } from "@/lib/auth";
import {
  createMetaTemplate,
  fetchMetaTemplates,
  MetaTemplateError,
  type CreateMetaTemplateButton,
  type CreateMetaTemplateComponent,
  type CreateMetaTemplatePayload,
} from "@/lib/meta-templates";

const TemplateButtonSchema = z.object({
  type: z.string().min(1),
  text: z.string().optional(),
  url: z.string().optional(),
  phoneNumber: z.string().optional(),
  phone_number: z.string().optional(),
  example: z.unknown().optional(),
});

const TemplateComponentSchema = z.object({
  type: z.string().min(1),
  format: z.string().optional(),
  subType: z.string().optional(),
  sub_type: z.string().optional(),
  text: z.string().optional(),
  example: z.unknown().optional(),
  buttons: z.array(TemplateButtonSchema).optional(),
});

const TemplateCreateSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  language: z.string().min(1),
  allowCategoryChange: z.boolean().optional(),
  components: z.array(TemplateComponentSchema).optional(),
});

const mapButtonPayload = (
  data: z.infer<typeof TemplateButtonSchema>,
): CreateMetaTemplateButton => ({
  type: data.type,
  text: data.text ?? undefined,
  url: data.url ?? undefined,
  phoneNumber: data.phoneNumber ?? data.phone_number ?? undefined,
  example:
    data.example && typeof data.example === "object"
      ? (data.example as Record<string, unknown>)
      : undefined,
});

const mapComponentPayload = (
  data: z.infer<typeof TemplateComponentSchema>,
): CreateMetaTemplateComponent => ({
  type: data.type,
  format: data.format ?? undefined,
  subType: data.subType ?? data.sub_type ?? undefined,
  text: data.text ?? undefined,
  example:
    data.example && typeof data.example === "object"
      ? (data.example as Record<string, unknown>)
      : undefined,
  buttons: Array.isArray(data.buttons)
    ? data.buttons.map((button) => mapButtonPayload(button))
    : undefined,
});

const mapCreatePayload = (
  data: z.infer<typeof TemplateCreateSchema>,
): CreateMetaTemplatePayload => ({
  name: data.name,
  category: data.category,
  language: data.language,
  allowCategoryChange: data.allowCategoryChange ?? undefined,
  components: Array.isArray(data.components)
    ? data.components.map((component) => mapComponentPayload(component))
    : undefined,
});

export async function GET(request: Request) {
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const templates = await fetchMetaTemplates(auth.userId);
    return NextResponse.json(templates);
  } catch (error) {
    if (error instanceof MetaTemplateError) {
      return NextResponse.json(
        { error: error.message, details: error.details ?? null },
        { status: error.status ?? 502 },
      );
    }

    console.error("Failed to fetch Meta templates", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const parsed = TemplateCreateSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 },
      );
    }

    const mapped = mapCreatePayload(parsed.data);
    const result = await createMetaTemplate(auth.userId, mapped);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof MetaTemplateError) {
      return NextResponse.json(
        { error: error.message, details: error.details ?? null },
        { status: error.status ?? 502 },
      );
    }

    console.error("Failed to create Meta template", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 },
    );
  }
}
