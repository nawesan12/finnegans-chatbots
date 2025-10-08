import { NextRequest, NextResponse } from "next/server";
import {
  processWebhookGet,
  processWebhookPost,
  processWebhookOptions,
  type WebhookRequest,
  type WebhookResponse,
} from "./webhook-logic";

function toWebhookRequest(req: NextRequest): WebhookRequest {
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
        headers[key] = value;
    });

    const query: Record<string, string> = {};
    req.nextUrl.searchParams.forEach((value, key) => {
        query[key] = value;
    });

    // The body will be read and passed in the handlers below
    return {
        headers,
        query,
        body: "",
        url: req.url,
    };
}

function fromWebhookResponse(res: WebhookResponse): NextResponse {
  if (res.json) {
    return NextResponse.json(res.json, {
      status: res.status,
      headers: res.headers,
    });
  }

  if (res.text) {
    return new NextResponse(res.text, {
      status: res.status,
      headers: res.headers,
    });
  }

  return new NextResponse(null, {
    status: res.status,
    headers: res.headers,
  });
}

export async function handleWebhookGet(
  req: NextRequest,
): Promise<NextResponse> {
  const webhookRequest = toWebhookRequest(req);
  const webhookResponse = await processWebhookGet(webhookRequest);
  return fromWebhookResponse(webhookResponse);
}

export async function handleWebhookPost(
  req: NextRequest,
): Promise<NextResponse> {
  const webhookRequest = toWebhookRequest(req);
  webhookRequest.body = await req.text();
  const webhookResponse = await processWebhookPost(webhookRequest);
  return fromWebhookResponse(webhookResponse);
}

export async function handleWebhookOptions(
  req: NextRequest,
): Promise<NextResponse> {
  const webhookRequest = toWebhookRequest(req);
  const webhookResponse = await processWebhookOptions(webhookRequest);
  return fromWebhookResponse(webhookResponse);
}