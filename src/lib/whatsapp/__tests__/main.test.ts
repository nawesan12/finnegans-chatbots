import { jest } from "@jest/globals";
import prisma from "@/lib/prisma";
import { processWebhookEvent } from "../webhook";
import { sendMessage } from "../client";
import { executeFlow } from "../../flow-executor";

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  contact: {
    upsert: jest.fn(),
  },
  session: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  flow: {
    findMany: jest.fn(),
  },
}));

// Mock flow-executor
jest.mock("../../flow-executor", () => ({
  executeFlow: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockUser = {
  id: "user-1",
  metaPhoneNumberId: "123456789",
  metaAccessToken: "test-token",
};

const mockContact = {
  id: "contact-1",
  phone: "1122334455",
  userId: "user-1",
};

const mockFlow = {
  id: "flow-1",
  userId: "user-1",
  trigger: "hello",
  channel: "whatsapp",
  status: "Active",
};

const mockSession = {
  id: "session-1",
  contactId: "contact-1",
  flowId: "flow-1",
  status: "Active",
  flow: mockFlow,
  contact: mockContact,
};

const mockCompletedSession = {
  ...mockSession,
  status: "Completed",
};

describe("WhatsApp Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe("processWebhookEvent", () => {
    it("should process a text message and trigger a flow", async () => {
      const webhookEvent = {
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                value: {
                  metadata: { phone_number_id: "123456789" },
                  messages: [
                    {
                      id: "msg-1",
                      from: "1122334455",
                      type: "text",
                      text: { body: "Hello" },
                    },
                  ],
                  contacts: [{ wa_id: "1122334455", profile: { name: "Test User" } }],
                },
              },
            ],
          },
        ],
      };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prisma.contact.upsert as jest.Mock).mockResolvedValue(mockContact);
      (prisma.session.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null); // No active session history
      (prisma.flow.findMany as jest.Mock).mockResolvedValue([mockFlow]);
      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);

      await processWebhookEvent(webhookEvent);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { metaPhoneNumberId: "123456789" },
      });
      expect(prisma.contact.upsert).toHaveBeenCalled();
      expect(executeFlow).toHaveBeenCalledTimes(1);
      const execArgs = (executeFlow as jest.Mock).mock.calls[0];
      expect(execArgs[1]).toBe("Hello");
      expect(execArgs[3]).toEqual({
        type: "text",
        rawText: "Hello",
        interactive: null,
      });
    });

    it("should resume the assigned flow session and pass interactive metadata", async () => {
      const webhookEvent = {
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                value: {
                  metadata: { phone_number_id: "123456789" },
                  messages: [
                    {
                      id: "msg-2",
                      from: "1122334455",
                      type: "interactive",
                      interactive: {
                        type: "button",
                        button_reply: { id: "btn-1", title: "Yes" },
                      },
                    },
                  ],
                  contacts: [
                    { wa_id: "1122334455", profile: { name: "Test User" } },
                  ],
                },
              },
            ],
          },
        ],
      };

      const resumedSession = { ...mockSession };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prisma.contact.upsert as jest.Mock).mockResolvedValue(mockContact);
      (prisma.session.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockCompletedSession);
      (prisma.session.update as jest.Mock).mockResolvedValue(resumedSession);

      await processWebhookEvent(webhookEvent);

      expect(prisma.flow.findMany).not.toHaveBeenCalled();
      expect(prisma.session.create).not.toHaveBeenCalled();
      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: mockCompletedSession.id },
        data: { status: "Active", currentNodeId: null, context: {} },
        include: { flow: true, contact: true },
      });

      expect(executeFlow).toHaveBeenCalledTimes(1);
      const execArgs = (executeFlow as jest.Mock).mock.calls[0];
      expect(execArgs[1]).toBe("Yes");
      expect(execArgs[3]).toEqual({
        type: "interactive",
        rawText: "Yes",
        interactive: { type: "button", id: "btn-1", title: "Yes" },
      });
    });

    it("should not process if user is not found", async () => {
      const webhookEvent = {
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                value: {
                  metadata: { phone_number_id: "unknown-id" },
                  messages: [{ id: "msg-1", from: "1122334455", type: "text", text: { body: "Hello" } }],
                },
              },
            ],
          },
        ],
      };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await processWebhookEvent(webhookEvent);

      expect(executeFlow).not.toHaveBeenCalled();
    });
  });

  describe("sendMessage", () => {
    it("should send a text message successfully", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messages: [{ id: "sent-msg-id" }] }),
      });

      const result = await sendMessage("user-1", "1122334455", {
        type: "text",
        text: "Hello from the test",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/messages"),
        expect.any(Object),
      );
      expect(result.success).toBe(true);
      expect(result.messageId).toBe("sent-msg-id");
    });

    it("should fail if user credentials are not found", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await sendMessage("user-1", "1122334455", {
        type: "text",
        text: "This should fail",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Missing Meta API credentials");
    });

    it("should handle API errors gracefully", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: { message: "Invalid parameter" } }),
      });

      const result = await sendMessage("user-1", "1122334455", {
        type: "text",
        text: "This will cause an API error",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(result.details).toBeDefined();
    });
  });
});