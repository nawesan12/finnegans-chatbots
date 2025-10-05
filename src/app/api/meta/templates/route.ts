import { NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { fetchMetaTemplates, MetaTemplateError } from "@/lib/meta-templates";

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
