import { jest } from "@jest/globals";
import { handleWebhookPost } from "../webhook";
import { NextRequest } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { processWebhookEvent } from "@/lib/whatsapp/webhook";

jest.mock("@/lib/prisma", () => ({
  user: {
    findFirst: jest.fn(),
  },
}));

jest.mock("@/lib/whatsapp/webhook", () => ({
  processWebhookEvent: jest.fn(),
}));

const secret = "test-secret";
const payload = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [
    {
      changes: [
        {
          value: {
            metadata: { phone_number_id: "123456789" },
            messages: [{ id: "msg-1", from: "1122334455", type: "text", text: { body: "Hello" } }],
          },
        },
      ],
    },
  ],
});

function createMockRequest(payload: string, secret: string | null): NextRequest {
  const headers: Record<string, string> = {};
  if (secret) {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    const signature = `sha256=${hmac.digest("hex")}`;
    headers["x-hub-signature-256"] = signature;
  }

  const request = new NextRequest("https://example.com/api/webhook", {
    method: "POST",
    headers,
    body: payload,
  });
  return request;
}

describe("Webhook Signature Verification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ metaAppSecret: secret });
    (processWebhookEvent as jest.Mock).mockResolvedValue(undefined);
  });

  it("should return 200 for a valid signature", async () => {
    const request = createMockRequest(payload, secret);
    const response = await handleWebhookPost(request);
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(processWebhookEvent).toHaveBeenCalled();
  });

  it("should return 401 for an invalid signature", async () => {
    const request = createMockRequest(payload, "wrong-secret");
    const response = await handleWebhookPost(request);
    const json = await response.json();
    expect(response.status).toBe(401);
    expect(json.error).toBe("Invalid signature");
    expect(processWebhookEvent).not.toHaveBeenCalled();
  });

  it("should return 401 if the signature header is missing", async () => {
    const request = createMockRequest(payload, null);
    const response = await handleWebhookPost(request);
    const json = await response.json();
    expect(response.status).toBe(401);
    expect(json.error).toBe("Missing signature");
  });

  it("should return 404 if user is not configured", async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    const request = createMockRequest(payload, secret);
    const response = await handleWebhookPost(request);
    const json = await response.json();
    expect(response.status).toBe(404);
    expect(json.error).toBe("User not configured");
  });
});