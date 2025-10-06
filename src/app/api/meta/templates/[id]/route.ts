import { NextResponse } from "next/server";

import { getAuthPayload } from "@/lib/auth";
import { deleteMetaTemplate, MetaTemplateError } from "@/lib/meta-templates";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const templateId = params.id;

  try {
    await deleteMetaTemplate(auth.userId, templateId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof MetaTemplateError) {
      return NextResponse.json(
        { error: error.message, details: error.details ?? null },
        { status: error.status ?? 502 },
      );
    }

    console.error(`Failed to delete Meta template ${templateId}`, error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 },
    );
  }
}
