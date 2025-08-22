import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;

export async function processWebhookEvent(data: any) {
  if (data.object) {
    if (
      data.entry &&
      data.entry[0].changes &&
      data.entry[0].changes[0] &&
      data.entry[0].changes[0].value.messages &&
      data.entry[0].changes[0].value.messages[0]
    ) {
      const from = data.entry[0].changes[0].value.messages[0].from;
      const text = data.entry[0].changes[0].value.messages[0].text.body;
      const phoneNumberId =
        data.entry[0].changes[0].value.metadata.phone_number_id;

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

      await prisma.log.create({
        data: {
          flowId: flow.id,
          contactId: contact.id,
          status: "Started",
          context: {
            lastMessage: text,
          },
        },
      });

      // For now, just send a canned response.
      // In the future, this will be replaced with the flow execution logic.
      await sendMessage(user.id, from, "Hello! This is a canned response.");
    }
  }
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
