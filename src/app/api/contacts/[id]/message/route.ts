import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/session";
import prisma from "@/lib/prisma";
import { sendMessage } from "@/lib/meta";

const messagePayloadSchema = z.object({
  message: z.string().min(1, "El mensaje no puede estar vacío."),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const contactId = params.id;
    const body = await request.json();

    const payload = messagePayloadSchema.safeParse(body);
    if (!payload.success) {
      return NextResponse.json(
        { error: payload.error.flatten().fieldErrors.message?.[0] },
        { status: 400 },
      );
    }

    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        userId: user.id,
      },
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Contacto no encontrado" },
        { status: 404 },
      );
    }

    const result = await sendMessage(user.id, contact.phone, {
      type: "text",
      text: payload.data.message,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Error al enviar el mensaje" },
        { status: result.status || 500 },
      );
    }

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Ocurrió un error inesperado" },
      { status: 500 },
    );
  }
}