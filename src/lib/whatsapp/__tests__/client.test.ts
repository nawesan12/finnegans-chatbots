import { jest } from "@jest/globals";
import prisma from "@/lib/prisma";
import { sendMessage } from "../client";

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  user: {
    findUnique: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

const mockUser = {
  id: "user-1",
  metaPhoneNumberId: "123456789",
  metaAccessToken: "test-token",
};

describe("sendMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages: [{ id: "sent-msg-id" }] }),
    });
  });

  it("should send a text message with the correct payload", async () => {
    await sendMessage("user-1", "1122334455", {
      type: "text",
      text: "Hello World",
    });

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);

    expect(body).toMatchObject({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "1122334455",
      type: "text",
      text: { body: "Hello World", preview_url: false },
    });
  });

  it("should send an image message with an ID", async () => {
    await sendMessage("user-1", "1122334455", {
      type: "media",
      mediaType: "image",
      id: "media-id",
      caption: "A beautiful picture",
    });

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);

    expect(body).toMatchObject({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "1122334455",
      type: "image",
      image: { id: "media-id", caption: "A beautiful picture" },
    });
  });

  it("should send a video message with a URL", async () => {
    await sendMessage("user-1", "1122334455", {
      type: "media",
      mediaType: "video",
      url: "https://example.com/video.mp4",
    });

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);

    expect(body).toMatchObject({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "1122334455",
      type: "video",
      video: { link: "https://example.com/video.mp4" },
    });
  });

  it("should return an error if media message has no id or url", async () => {
    const result = await sendMessage("user-1", "1122334455", {
      type: "media",
      mediaType: "image",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("must have either an id or a url");
  });

  it("should send an options message (buttons)", async () => {
    await sendMessage("user-1", "1122334455", {
      type: "options",
      text: "Choose one:",
      options: ["Option 1", "Option 2"],
    });

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);

    expect(body.messaging_product).toBe("whatsapp");
    expect(body.recipient_type).toBe("individual");
    expect(body.interactive.type).toBe("button");
    expect(body.interactive.action.buttons).toHaveLength(2);
    expect(body.interactive.action.buttons[0].reply.id).toBe("option 1");
  });

  it("should send a list message", async () => {
    await sendMessage("user-1", "1122334455", {
      type: "list",
      text: "Please select",
      button: "View Options",
      sections: [{ title: "Section 1", rows: [{ id: "row-1", title: "Row 1" }] }],
    });

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);

    expect(body.messaging_product).toBe("whatsapp");
    expect(body.recipient_type).toBe("individual");
    expect(body.interactive.type).toBe("list");
    expect(body.interactive.action.button).toBe("View Options");
    expect(body.interactive.action.sections[0].rows).toHaveLength(1);
  });

  it("should send a flow message with the correct payload", async () => {
    await sendMessage("user-1", "1122334455", {
      type: "flow",
      flow: {
        id: "flow-id-123",
        cta: "Open Flow",
        token: "flow-token-456",
        body: "This is the body of the flow message.",
        header: "Flow Header",
        footer: "Flow Footer",
      },
    });

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);

    expect(body.messaging_product).toBe("whatsapp");
    expect(body.recipient_type).toBe("individual");
    expect(body.type).toBe("interactive");
    expect(body.interactive.type).toBe("flow");
    expect(body.interactive.action.name).toBe("flow");
    expect(body.interactive.action.parameters.flow_message_version).toBe("3");
    expect(body.interactive.action.parameters.flow_id).toBe("flow-id-123");
    expect(body.interactive.action.parameters.flow_cta).toBe("Open Flow");
    expect(body.interactive.action.parameters.flow_token).toBe("flow-token-456");
    expect(body.interactive.body.text).toBe("This is the body of the flow message.");
    expect(body.interactive.header.text).toBe("Flow Header");
    expect(body.interactive.footer.text).toBe("Flow Footer");
  });

  it("should return an error if flow message is missing id or cta", async () => {
    const result1 = await sendMessage("user-1", "1122334455", {
      type: "flow",
      flow: { id: "flow-id", cta: "" },
    });
    expect(result1.success).toBe(false);
    expect(result1.error).toContain("Missing WhatsApp Flow ID or CTA");

    const result2 = await sendMessage("user-1", "1122334455", {
      type: "flow",
      flow: { id: "", cta: "Go" },
    });
    expect(result2.success).toBe(false);
    expect(result2.error).toContain("Missing WhatsApp Flow ID or CTA");
  });

  it("should return an error for invalid phone number", async () => {
    const result = await sendMessage("user-1", "invalid-phone", { type: "text", text: "test" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid destination phone number");
  });

  it("should handle API errors gracefully", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: "Unauthorized" }),
    });
    const result = await sendMessage("user-1", "1122334455", { type: "text", text: "test" });
    expect(result.success).toBe(false);
    expect(result.status).toBe(401);
  });
});