import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { getAuthPayload } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  isReceivedLogStatus,
  isSentLogStatus,
} from "@/lib/dashboard/statuses";

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 50;

const MESSAGE_KEYS = ["text", "body", "message", "caption", "title", "description"];
const DIRECTION_KEYS = [
  "direction",
  "messageDirection",
  "type",
  "eventType",
  "source",
  "event",
];
const CHANNEL_KEYS = ["channel", "platform", "provider", "source"];

const METADATA_FIELDS: Array<{ key: string; label: string }> = [
  { key: "nodeName", label: "Nodo" },
  { key: "nodeId", label: "Nodo" },
  { key: "sessionId", label: "Sesión" },
  { key: "trigger", label: "Trigger" },
  { key: "templateName", label: "Plantilla" },
  { key: "reason", label: "Motivo" },
  { key: "actor", label: "Actor" },
  { key: "agent", label: "Agente" },
  { key: "event", label: "Evento" },
];

function toObject(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function sanitizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function searchForString(
  value: unknown,
  preferredKeys: string[],
  visited: WeakSet<object>,
  depth = 0,
): string | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (depth > 4) {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = searchForString(item, preferredKeys, visited, depth + 1);
      if (result) {
        return result;
      }
    }
    return null;
  }

  if (typeof value === "object") {
    if (visited.has(value)) {
      return null;
    }
    visited.add(value);

    const record = value as Record<string, unknown>;

    for (const key of preferredKeys) {
      if (Object.prototype.hasOwnProperty.call(record, key)) {
        const candidate = searchForString(
          record[key],
          preferredKeys,
          visited,
          depth + 1,
        );
        if (candidate) {
          return candidate;
        }
      }
    }

    for (const key of Object.keys(record)) {
      if (preferredKeys.includes(key)) {
        continue;
      }
      const candidate = searchForString(
        record[key],
        preferredKeys,
        visited,
        depth + 1,
      );
      if (candidate) {
        return candidate;
      }
    }
  }

  return null;
}

function extractStringFromContext(
  context: Prisma.JsonValue | null,
  keys: string[],
): string | null {
  if (!context) {
    return null;
  }
  return searchForString(context, keys, new WeakSet());
}

function normalizeDirection(value: string | null, status: string | null):
  | "inbound"
  | "outbound"
  | "system"
  | "unknown" {
  if (value) {
    const normalized = value.toLowerCase();
    if (["inbound", "incoming", "received", "entrada"].some((entry) => normalized.includes(entry))) {
      return "inbound";
    }
    if (["outbound", "outgoing", "sent", "salida"].some((entry) => normalized.includes(entry))) {
      return "outbound";
    }
    if (["system", "internal", "automation", "auto"].some((entry) => normalized.includes(entry))) {
      return "system";
    }
  }

  if (isSentLogStatus(status ?? undefined)) {
    return "outbound";
  }

  if (isReceivedLogStatus(status ?? undefined)) {
    return "inbound";
  }

  if (status) {
    return "system";
  }

  return "unknown";
}

function extractMetadata(context: Prisma.JsonValue | null) {
  const output: Array<{ key: string; value: string }> = [];
  const record = toObject(context);

  if (!record) {
    return output;
  }

  for (const field of METADATA_FIELDS) {
    const raw = record[field.key];
    const value = sanitizeString(raw) ?? (typeof raw === "number" ? String(raw) : null);
    if (value) {
      output.push({ key: field.label, value });
    }
  }

  return output;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = getAuthPayload(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const contactId = params.id;

  if (!contactId) {
    return NextResponse.json({ error: "Contact ID is required" }, { status: 400 });
  }

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId: auth.userId },
    select: { id: true },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit"));
  const cursor = searchParams.get("cursor") ?? undefined;

  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.trunc(limitParam), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  try {
    const logs = await prisma.log.findMany({
      where: {
        contactId,
        flow: { userId: auth.userId },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        createdAt: true,
        status: true,
        context: true,
        flow: {
          select: {
            id: true,
            name: true,
            channel: true,
          },
        },
      },
    });

    const hasMore = logs.length > limit;
    const trimmedLogs = hasMore ? logs.slice(0, -1) : logs;
    const nextCursor = hasMore ? trimmedLogs[trimmedLogs.length - 1]?.id ?? null : null;

    const items = trimmedLogs.map((log) => {
      const messagePreview = extractStringFromContext(log.context, MESSAGE_KEYS);
      const directionRaw = extractStringFromContext(log.context, DIRECTION_KEYS);
      const channelRaw = extractStringFromContext(log.context, CHANNEL_KEYS);

      const direction = normalizeDirection(directionRaw, log.status ?? null);
      const channel = sanitizeString(channelRaw) ?? sanitizeString(log.flow?.channel ?? null);

      const metadata = extractMetadata(log.context);

      return {
        id: log.id,
        createdAt: log.createdAt.toISOString(),
        status: log.status,
        direction,
        channel,
        flowName: sanitizeString(log.flow?.name ?? null),
        messagePreview,
        metadata,
      };
    });

    return NextResponse.json({
      items,
      nextCursor,
    });
  } catch (error) {
    console.error(`Error fetching activity for contact ${contactId}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
