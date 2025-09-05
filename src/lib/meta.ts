import { PrismaClient } from "@prisma/client";
import { executeFlow } from "./flow-executor";

const prisma = new PrismaClient();

interface MetaWebhookMessage {
  from: string;
  text: { body: string };
}

interface MetaWebhookEntry {
  changes: {
    value: {
      messages?: MetaWebhookMessage[];
      metadata: { phone_number_id: string };
    };
  }[];
}

interface MetaWebhookEvent {
  object?: string;
  entry?: MetaWebhookEntry[];
}

export async function processWebhookEvent(data: MetaWebhookEvent) {
  const message = data.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const phoneNumberId =
    data.entry?.[0]?.changes?.[0]?.value?.metadata.phone_number_id;

  if (!data.object || !message || !phoneNumberId) {
    return;
  }

  const from = message.from;
  const text = message.text.body;

  const user = await prisma.user.findFirst({
    where: { metaPhoneNumberId: phoneNumberId },
  });

  if (!user) {
    console.error("User not found for phone number ID:", phoneNumberId);
    return;
  }

  let contact = await prisma.contact.findUnique({
    where: { phone: from },
  });

  if (contact && contact.userId !== user.id) {
    console.error(
      `Contact with phone ${from} exists but belongs to another user.`,
    );
    return;
  }

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        phone: from,
        userId: user.id,
      },
    });
  }

  const flow = await prisma.flow.findFirst({
    where: {
      userId: user.id,
      status: "Active",
    },
  });

  if (!flow) {
    console.error("No active flow found for user:", user.id);
    return;
  }

  // Find or create a session
  let session = await prisma.session.findUnique({
    where: { contactId_flowId: { contactId: contact.id, flowId: flow.id } },
    include: { flow: true, contact: true },
  });

  if (!session) {
    session = await prisma.session.create({
      data: {
        contactId: contact.id,
        flowId: flow.id,
        status: "Active",
      },
      include: { flow: true, contact: true },
    });
  } else if (session.status === "Completed") {
    // If the session is completed, create a new one
    session = await prisma.session.create({
        data: {
          contactId: contact.id,
          flowId: flow.id,
          status: "Active",
        },
        include: { flow: true, contact: true },
      });
  }


  await executeFlow(session, text, sendMessage);
}

type SendMessagePayload =
  | { type: "text"; text: string }
  | { type: "media"; mediaType: string; url: string; caption?: string }
  | { type: "options"; text: string; options: string[] };

export async function sendMessage(
  userId: string,
  to: string,
  message: SendMessagePayload,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      metaAccessToken: true,
      metaPhoneNumberId: true,
    },
  });

  if (!user || !user.metaAccessToken || !user.metaPhoneNumberId) {
    console.error("Missing Meta API credentials for user:", userId);
    return;
  }

  const url = `https://graph.facebook.com/v20.0/${user.metaPhoneNumberId}/messages`;
  const headers = {
    Authorization: `Bearer ${user.metaAccessToken}`,
    "Content-Type": "application/json",
  };

  let body: any;

  switch (message.type) {
    case "text":
      body = {
        messaging_product: "whatsapp",
        to,
        text: { body: message.text },
      };
      break;
    case "media":
      body = {
        messaging_product: "whatsapp",
        to,
        type: message.mediaType,
        [message.mediaType]: {
          link: message.url,
          caption: message.caption,
        },
      };
      break;
    case "options":
      body = {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "button",
          body: {
            text: message.text,
          },
          action: {
            buttons: message.options.map((opt) => ({
              type: "reply",
              reply: {
                id: opt.toLowerCase().replace(/\s+/g, "_"),
                title: opt,
              },
            })),
          },
        },
      };
      break;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error("Error sending message:", await response.text());
    }
  } catch (error) {
    console.error("Error sending message:", error);
  }
}
