import { NextRequest, NextResponse } from "next/server";

import {
  handleWebhookGet,
  handleWebhookOptions,
  handleWebhookPost,
  type WebhookResult,
} from "@/server/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function applyHeaders(
  response: NextResponse,
  headers?: Record<string, string>,
) {
  if (!headers) {
    return response;
  }

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

function toNextResponse(result: WebhookResult) {
  if ("json" in result) {
    return applyHeaders(
      NextResponse.json(result.json, { status: result.status }),
      result.headers,
    );
  }

  if ("text" in result) {
    return applyHeaders(
      new NextResponse(result.text, { status: result.status }),
      result.headers,
    );
  }

  return applyHeaders(new NextResponse(null, { status: result.status }), result.headers);
}

export async function GET(request: NextRequest) {
  const result = await handleWebhookGet(request);
  return toNextResponse(result);
}

export async function POST(request: NextRequest) {
  const result = await handleWebhookPost(request);
  return toNextResponse(result);
}

export async function OPTIONS(request: NextRequest) {
  const result = await handleWebhookOptions(request);
  return toNextResponse(result);
}
