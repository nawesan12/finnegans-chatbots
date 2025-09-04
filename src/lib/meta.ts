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
    where: { phone: from, userId: user.id },
  });

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

  await executeFlow(flow.id, contact.id, text, sendMessage);
}

export async function sendMessage(userId: string, to: string, text: string) {
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
  const body = JSON.stringify({
    messaging_product: "whatsapp",
    to,
    text: { body: text },
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
    });

    if (!response.ok) {
      console.error("Error sending message:", await response.text());
    }
  } catch (error) {
    console.error("Error sending message:", error);
  }
}
