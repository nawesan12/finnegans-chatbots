import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { isValidLeadStatus } from "@/lib/leads";

const MAX_NOTES_LENGTH = 2000;

export async function PATCH(
  request: NextRequest,
  context: { params?: Promise<{ id: string }> },
) {
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = context.params ? await context.params : undefined;
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    console.error("Failed to parse lead update payload", error);
    return NextResponse.json(
      { error: "No pudimos procesar la solicitud." },
      { status: 400 },
    );
  }

  if (typeof payload !== "object" || payload === null) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const { status, notes } = payload as {
    status?: unknown;
    notes?: unknown;
  };

  const data: Prisma.LeadUpdateInput = {};

  if (status !== undefined) {
    if (typeof status !== "string" || !isValidLeadStatus(status)) {
      return NextResponse.json(
        { error: "Estado no permitido." },
        { status: 400 },
      );
    }

    data.status = status;
  }

  if (notes !== undefined) {
    if (typeof notes !== "string") {
      return NextResponse.json(
        { error: "Las notas deben ser texto." },
        { status: 400 },
      );
    }

    const trimmed = notes.trim();
    if (trimmed.length > MAX_NOTES_LENGTH) {
      return NextResponse.json(
        { error: "Las notas son demasiado extensas." },
        { status: 400 },
      );
    }

    data.notes = trimmed.length > 0 ? trimmed : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No se enviaron cambios para actualizar." },
      { status: 400 },
    );
  }

  try {
    const lead = await prisma.lead.update({
      where: { id },
      data,
    });

    return NextResponse.json(lead);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "El lead no existe o ya fue eliminado." },
        { status: 404 },
      );
    }

    console.error("Failed to update lead", error);
    return NextResponse.json(
      { error: "No pudimos actualizar el lead." },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
