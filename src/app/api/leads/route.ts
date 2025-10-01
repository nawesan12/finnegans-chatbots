import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { leadFormSchema } from "@/lib/validations/lead";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const recentSubmissions = new Map<string, { count: number; timestamp: number }>();

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "anonymous";
  }
  return request.headers.get("x-real-ip") ?? "anonymous";
}

function isRateLimited(key: string) {
  const entry = recentSubmissions.get(key);
  if (!entry) {
    return false;
  }
  const now = Date.now();
  if (now - entry.timestamp > RATE_LIMIT_WINDOW_MS) {
    recentSubmissions.delete(key);
    return false;
  }
  return entry.count >= RATE_LIMIT_MAX_REQUESTS;
}

function registerRequest(key: string) {
  const entry = recentSubmissions.get(key);
  const now = Date.now();
  if (!entry || now - entry.timestamp > RATE_LIMIT_WINDOW_MS) {
    recentSubmissions.set(key, { count: 1, timestamp: now });
    return;
  }
  entry.count += 1;
}

export async function POST(request: Request) {
  const clientKey = getClientKey(request);
  if (isRateLimited(clientKey)) {
    return NextResponse.json(
      {
        error:
          "Realizaste demasiadas solicitudes en poco tiempo. Intenta nuevamente en unos minutos.",
      },
      { status: 429 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    console.error("Lead submission payload could not be parsed", error);
    return NextResponse.json(
      { error: "No pudimos procesar la solicitud." },
      { status: 400 },
    );
  }

  const sanitized = leadFormSchema.safeParse(payload);
  if (!sanitized.success) {
    const firstIssue = sanitized.error.issues[0];
    return NextResponse.json(
      { error: firstIssue?.message ?? "Datos inválidos." },
      { status: 422 },
    );
  }

  const leadData = sanitized.data;

  try {
    const lead = await prisma.lead.create({
      data: {
        name: leadData.name,
        email: leadData.email,
        company: leadData.company,
        phone: leadData.phone,
        message: leadData.message,
      },
    });

    registerRequest(clientKey);

    return NextResponse.json(
      {
        id: lead.id,
        status: "received",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Lead submission failed", error);
    return NextResponse.json(
      { error: "No pudimos registrar tu solicitud. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
