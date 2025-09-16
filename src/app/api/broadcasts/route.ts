import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { sendMessage } from "@/lib/meta";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const broadcasts = await prisma.broadcast.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        recipients: {
          include: {
            contact: {
              select: { id: true, name: true, phone: true },
            },
          },
        },
      },
    });

    return NextResponse.json(broadcasts);
  } catch (error) {
    console.error("Error fetching broadcasts:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      title,
      message,
      sendToAll,
      contactIds,
      filterTag,
    } = body ?? {};

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 },
      );
    }

    const normalizedMessage = message.trim();
    const normalizedTitle =
      typeof title === "string" && title.trim().length > 0
        ? title.trim()
        : null;
    const normalizedTag =
      typeof filterTag === "string" && filterTag.trim().length > 0
        ? filterTag.trim()
        : null;

    let contacts;

    if (sendToAll) {
      contacts = await prisma.contact.findMany({
        where: {
          userId,
          ...(normalizedTag
            ? {
                tags: {
                  some: {
                    tag: {
                      name: normalizedTag,
                    },
                  },
                },
              }
            : {}),
        },
        select: { id: true, phone: true, name: true },
      });
    } else {
      if (!Array.isArray(contactIds) || contactIds.length === 0) {
        return NextResponse.json(
          { error: "Select at least one contact" },
          { status: 400 },
        );
      }

      contacts = await prisma.contact.findMany({
        where: {
          id: { in: contactIds },
          userId,
          ...(normalizedTag
            ? {
                tags: {
                  some: {
                    tag: {
                      name: normalizedTag,
                    },
                  },
                },
              }
            : {}),
        },
        select: { id: true, phone: true, name: true },
      });
    }

    if (!contacts.length) {
      return NextResponse.json(
        { error: "No contacts found for the selection" },
        { status: 400 },
      );
    }

    const broadcast = await prisma.broadcast.create({
      data: {
        title: normalizedTitle,
        body: normalizedMessage,
        filterTag: normalizedTag,
        status: "Processing",
        totalRecipients: contacts.length,
        user: { connect: { id: userId } },
        recipients: {
          create: contacts.map((contact) => ({
            contact: { connect: { id: contact.id } },
          })),
        },
      },
      include: { recipients: true },
    });

    const contactsMap = new Map(contacts.map((c) => [c.id, c]));
    let successCount = 0;
    let failureCount = 0;

    for (const recipient of broadcast.recipients) {
      const contact = contactsMap.get(recipient.contactId);
      if (!contact) {
        failureCount += 1;
        await prisma.broadcastRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "Failed",
            error: "Contact not found",
          },
        });
        continue;
      }

      try {
        const ok = await sendMessage(userId, contact.phone, {
          type: "text",
          text: normalizedMessage,
        });

        if (ok) {
          successCount += 1;
          await prisma.broadcastRecipient.update({
            where: { id: recipient.id },
            data: {
              status: "Sent",
              sentAt: new Date(),
            },
          });
        } else {
          failureCount += 1;
          await prisma.broadcastRecipient.update({
            where: { id: recipient.id },
            data: {
              status: "Failed",
              error: "Meta API request failed",
            },
          });
        }
      } catch (error) {
        console.error("Error sending broadcast message:", error);
        failureCount += 1;
        await prisma.broadcastRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "Failed",
            error: "Unexpected error",
          },
        });
      }
    }

    const finalStatus =
      failureCount === 0
        ? "Completed"
        : successCount === 0
        ? "Failed"
        : "CompletedWithErrors";

    const updatedBroadcast = await prisma.broadcast.update({
      where: { id: broadcast.id },
      data: {
        status: finalStatus,
        successCount,
        failureCount,
      },
      include: {
        recipients: {
          include: {
            contact: {
              select: { id: true, name: true, phone: true },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedBroadcast, { status: 201 });
  } catch (error) {
    console.error("Error creating broadcast:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
