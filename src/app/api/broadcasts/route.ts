import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { sendMessage } from "@/lib/meta";
import prisma from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

const DEFAULT_CONTACT_NAME_FALLBACK = "Cliente";
const DEFAULT_FLOW_NAME_FALLBACK = "Flujo activo";
const DEFAULT_FLOW_KEYWORD_FALLBACK = "palabra clave";

type PlaceholderContext = {
  contact: { name: string | null; phone: string | null };
  flow: { name: string | null; trigger: string | null };
};

function applyBroadcastPlaceholders(
  template: string,
  context: PlaceholderContext,
) {
  const safeName =
    context.contact.name?.trim() ||
    context.contact.phone?.trim() ||
    DEFAULT_CONTACT_NAME_FALLBACK;

  const replacements: Record<string, string> = {
    "{{name}}": safeName,
    "{{phone}}": context.contact.phone ?? "",
    "{{flow}}": context.flow.name ?? DEFAULT_FLOW_NAME_FALLBACK,
    "{{keyword}}": context.flow.trigger ?? DEFAULT_FLOW_KEYWORD_FALLBACK,
  };

  return Object.entries(replacements).reduce((output, [token, value]) => {
    if (!output.includes(token)) return output;
    return output.split(token).join(value);
  }, template);
}

export async function GET(request: Request) {
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (userId && userId !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const broadcasts = await prisma.broadcast.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
      include: {
        recipients: {
          include: {
            contact: {
              select: { id: true, name: true, phone: true },
            },
          },
        },
        flow: { select: { id: true, name: true } },
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
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      title,
      message,
      sendToAll,
      contactIds,
      filterTag,
      flowId,
    } = body ?? {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 },
      );
    }

    if (!flowId || typeof flowId !== "string") {
      return NextResponse.json(
        { error: "Flow ID is required" },
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

    const flow = await prisma.flow.findFirst({
      where: { id: flowId, userId: auth.userId },
      select: { id: true, name: true, trigger: true },
    });

    if (!flow) {
      return NextResponse.json(
        { error: "Selected flow not found" },
        { status: 400 },
      );
    }

    let contacts;

    if (sendToAll) {
      contacts = await prisma.contact.findMany({
        where: {
          userId: auth.userId,
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
          userId: auth.userId,
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
        user: { connect: { id: auth.userId } },
        flow: { connect: { id: flow.id } },
        recipients: {
          create: contacts.map((contact) => ({
            contact: { connect: { id: contact.id } },
          })),
        },
      },
      include: {
        recipients: true,
        flow: { select: { id: true, name: true } },
      },
    });

    const sessionContextBase = {
      source: "broadcast",
      lastBroadcastId: broadcast.id,
      flowId: flow.id,
      flowName: flow.name,
      broadcastTitle: normalizedTitle ?? null,
      attachedAt: new Date().toISOString(),
    };

    await Promise.all(
      contacts.map((contact) => {
        const context = {
          ...sessionContextBase,
          contactId: contact.id,
        } as Prisma.JsonObject;

        return prisma.session.upsert({
          where: {
            contactId_flowId: { contactId: contact.id, flowId: flow.id },
          },
          update: {
            status: "Active",
            currentNodeId: null,
            context,
          },
          create: {
            contactId: contact.id,
            flowId: flow.id,
            status: "Active",
            currentNodeId: null,
            context,
          },
        });
      }),
    );

    const contactsMap = new Map(contacts.map((c) => [c.id, c]));
    let successCount = 0;
    let failureCount = 0;

    let tokenError: string | null = null;
    let forcedStopIndex: number | null = null;

    for (let index = 0; index < broadcast.recipients.length; index++) {
      const recipient = broadcast.recipients[index];
      const contact = contactsMap.get(recipient.contactId);
      if (!contact) {
        failureCount += 1;
        await prisma.broadcastRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "Failed",
            error: "Contact not found",
            statusUpdatedAt: new Date(),
          },
        });
        continue;
      }

      try {
        const personalizedMessage = applyBroadcastPlaceholders(
          normalizedMessage,
          {
            contact: { name: contact.name, phone: contact.phone },
            flow,
          },
        );

        const sendResult = await sendMessage(auth.userId, contact.phone, {
          type: "text",
          text: personalizedMessage,
        });

        if (sendResult.success) {
          successCount += 1;
          await prisma.broadcastRecipient.update({
            where: { id: recipient.id },
            data: {
              status: "Sent",
              sentAt: new Date(),
              statusUpdatedAt: new Date(),
              messageId: sendResult.messageId ?? null,
              error: null,
            },
          });
        } else {
          failureCount += 1;
          await prisma.broadcastRecipient.update({
            where: { id: recipient.id },
            data: {
              status: "Failed",
              error: sendResult.error ?? "Meta API request failed",
              statusUpdatedAt: new Date(),
            },
          });

          if (
            (sendResult.status === 401 ||
              sendResult.error?.toLowerCase().includes("access token")) &&
            !tokenError
          ) {
            tokenError =
              sendResult.error ??
              "Meta access token expired. Please reconnect WhatsApp in Settings.";
            forcedStopIndex = index;
            break;
          }
        }
      } catch (error) {
        console.error("Error sending broadcast message:", error);
        failureCount += 1;
        await prisma.broadcastRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "Failed",
            error: "Unexpected error",
            statusUpdatedAt: new Date(),
          },
        });
      }
    }

    if (tokenError !== null && forcedStopIndex !== null) {
      for (
        let index = forcedStopIndex + 1;
        index < broadcast.recipients.length;
        index++
      ) {
        const recipient = broadcast.recipients[index];
        failureCount += 1;
        await prisma.broadcastRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "Failed",
            error: tokenError,
            statusUpdatedAt: new Date(),
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
        flow: { select: { id: true, name: true } },
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
