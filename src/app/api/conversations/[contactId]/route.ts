import { NextResponse } from "next/server";

import { getAuthPayload } from "@/lib/auth";
import { fetchConversationByContactId } from "@/server/conversations";
import { sendMessage } from "@/lib/meta";
import prisma from "@/lib/prisma";

interface Params {
  contactId: string;
}

export async function GET(
  request: Request,
  context: { params: Promise<Params> },
) {
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contactId } = await context.params;

  try {
    const conversation = await fetchConversationByContactId(
      auth.userId,
      contactId,
    );

    if (!conversation) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error(
      `Error fetching conversation ${contactId}:`,
      error,
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<Params> },
) {
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contactId } = await context.params;

  try {
    const body = await request.json();
    const { text, type = "text" } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Message text is required" },
        { status: 400 },
      );
    }

    // Get contact to retrieve phone number
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        userId: auth.userId,
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Send message via WhatsApp
    const sendResult = await sendMessage(auth.userId, contact.phone, {
      type,
      text: text.trim(),
    });

    if (!sendResult.success) {
      return NextResponse.json(
        {
          error: sendResult.error ?? "Failed to send message",
          status: sendResult.status,
        },
        { status: sendResult.status ?? 500 },
      );
    }

    // Find active session for this contact
    const session = await prisma.session.findFirst({
      where: {
        contactId: contact.id,
        status: { in: ["Active", "Paused"] },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Save message to database
    const message = await prisma.message.create({
      data: {
        waMessageId: sendResult.messageId ?? null,
        direction: "outbound",
        type,
        content: text.trim(),
        status: "Sent",
        contactId: contact.id,
        userId: auth.userId,
        sessionId: session?.id ?? null,
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error(`Error sending message to contact ${contactId}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
