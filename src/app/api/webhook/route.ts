import { NextRequest } from "next/server";

import {
  handleWebhookGet,
  handleWebhookOptions,
  handleWebhookPost,
} from "@/server/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleWebhookGet(request);
}

export async function POST(request: NextRequest) {
  return handleWebhookPost(request);
}

export async function OPTIONS(request: NextRequest) {
  return handleWebhookOptions(request);
}
