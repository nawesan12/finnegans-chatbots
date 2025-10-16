import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import type {
  ConversationMessage,
  ConversationSummary,
} from "@/lib/conversations/types";

export interface SessionWithRelations {
  id: string;
  status: string;
  context: Prisma.JsonValue | null;
  updatedAt: Date;
  contactId: string;
  contact: { id: string; name: string | null; phone: string };
  flow: { id: string; name: string };
}

type SessionContext = Prisma.JsonValue | null | undefined;

type ConversationAccumulator = {
  flows: Map<string, { id: string; name: string }>;
  lastActivity: Date;
  lastMessage: string;
  unreadCount: number;
  messages: ConversationMessage[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeDirection(value: unknown): "in" | "out" | "system" {
  if (value === "in" || value === "out") {
    return value;
  }
  return "system";
}

function ensureTimestamp(value: unknown, fallback: Date): string {
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  return fallback.toISOString();
}

function formatMetadata(payload: Record<string, unknown>): string[] {
  const metadata: string[] = [];

  if (typeof payload.interactiveType === "string") {
    metadata.push(`Interacción: ${payload.interactiveType}`);
  }
  if (typeof payload.interactiveTitle === "string") {
    metadata.push(`Opción: ${payload.interactiveTitle}`);
  }
  if (typeof payload.interactiveId === "string") {
    metadata.push(`ID: ${payload.interactiveId}`);
  }
  if (payload.optionIndex !== undefined && payload.optionIndex !== null) {
    metadata.push(`Índice seleccionado: ${payload.optionIndex}`);
  }
  if (typeof payload.mediaType === "string") {
    metadata.push(`Contenido: ${payload.mediaType}`);
  }
  if (typeof payload.url === "string") {
    metadata.push(payload.url);
  }
  if (isRecord(payload.flow) && typeof payload.flow.name === "string") {
    metadata.push(`Flujo: ${payload.flow.name}`);
  }
  if (isRecord(payload.template) && typeof payload.template.name === "string") {
    metadata.push(`Plantilla: ${payload.template.name}`);
  }

  return metadata;
}

function stringifyPayload(payload: Record<string, unknown>): string {
  const candidates: Array<string | null> = [];

  if (typeof payload.text === "string") {
    candidates.push(payload.text.trim());
  }
  if (typeof payload.caption === "string") {
    candidates.push(payload.caption.trim());
  }
  if (typeof payload.interactiveTitle === "string") {
    candidates.push(payload.interactiveTitle.trim());
  }
  if (typeof payload.url === "string") {
    candidates.push(payload.url.trim());
  }
  if (isRecord(payload.flow) && typeof payload.flow.name === "string") {
    candidates.push(`Flujo: ${payload.flow.name}`);
  }

  const firstMeaningful = candidates.find((candidate) => candidate);
  if (firstMeaningful) {
    return firstMeaningful;
  }

  try {
    const serialized = JSON.stringify(payload);
    if (serialized.length > 280) {
      return `${serialized.slice(0, 277)}...`;
    }
    return serialized;
  } catch {
    return "(sin detalles disponibles)";
  }
}

function extractHistoryMessages(
  context: SessionContext,
  fallbackDate: Date,
  sessionId: string,
): ConversationMessage[] {
  if (!isRecord(context)) {
    return [];
  }

  const meta = context["_meta"];
  if (!isRecord(meta)) {
    return [];
  }

  const history = meta["history"];
  if (!Array.isArray(history)) {
    return [];
  }

  const messages: ConversationMessage[] = [];

  history.forEach((entry, index) => {
    if (!isRecord(entry)) {
      return;
    }

    const payload = entry["payload"];
    const normalizedDirection = normalizeDirection(entry["direction"]);
    const type = typeof entry["type"] === "string" ? entry["type"] : "text";
    const timestamp = ensureTimestamp(entry["timestamp"], fallbackDate);

    let text = "";
    let metadata: string[] = [];

    if (isRecord(payload)) {
      text = stringifyPayload(payload);
      metadata = formatMetadata(payload);
    } else if (typeof payload === "string") {
      text = payload;
    }

    if (!text) {
      text =
        normalizedDirection === "system"
          ? "Actualización de flujo"
          : "(sin contenido)";
    }

    messages.push({
      id: `${sessionId}-history-${index}`,
      direction: normalizedDirection,
      type,
      text,
      timestamp,
      metadata,
    });
  });

  return messages;
}

export function buildConversationSummaries(
  sessions: SessionWithRelations[],
): ConversationSummary[] {
  const map = new Map<string, ConversationAccumulator>();

  sessions.forEach((session) => {
    const existing = map.get(session.contactId);
    const fallbackDate = session.updatedAt;
    const historyMessages = extractHistoryMessages(
      session.context,
      fallbackDate,
      session.id,
    );

    const flows = existing?.flows ?? new Map<string, { id: string; name: string }>();
    flows.set(session.flow.id, { id: session.flow.id, name: session.flow.name });

    const messages = existing?.messages ?? [];
    messages.push(
      ...historyMessages.map((message) => ({
        ...message,
        metadata: message.metadata,
      })),
    );

    if (!historyMessages.length) {
      messages.push({
        id: `${session.id}-status`,
        direction: "system",
        type: "status",
        text: `Estado del flujo: ${session.status}`,
        timestamp: fallbackDate.toISOString(),
        metadata: [],
      });
    }

    const lastMessage = messages[messages.length - 1];
    const lastActivityDate = lastMessage
      ? new Date(lastMessage.timestamp)
      : fallbackDate;

    const lastOutboundIndex = historyMessages.reduce(
      (acc, message, index) => (message.direction === "out" ? index : acc),
      -1,
    );
    const unread = historyMessages.reduce((count, message, index) => {
      if (message.direction !== "in") {
        return count;
      }
      if (lastOutboundIndex >= 0 && index <= lastOutboundIndex) {
        return count;
      }
      return count + 1;
    }, 0);

    const previousLastActivity = existing?.lastActivity ?? fallbackDate;
    const isMoreRecent =
      lastActivityDate.getTime() >= previousLastActivity.getTime();

    const accumulator: ConversationAccumulator = {
      flows,
      lastActivity: isMoreRecent ? lastActivityDate : previousLastActivity,
      lastMessage: isMoreRecent
        ? lastMessage?.text ?? existing?.lastMessage ?? ""
        : existing?.lastMessage ?? lastMessage?.text ?? "",
      unreadCount: (existing?.unreadCount ?? 0) + unread,
      messages,
    };

    map.set(session.contactId, accumulator);
  });

  const summaries: ConversationSummary[] = [];

  for (const [contactId, accumulator] of map.entries()) {
    const session = sessions.find((entry) => entry.contactId === contactId);
    if (!session) {
      continue;
    }

    const sortedMessages = [...accumulator.messages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const lastMessage =
      sortedMessages.length > 0
        ? sortedMessages[sortedMessages.length - 1].text
        : accumulator.lastMessage;

    summaries.push({
      contactId,
      contactName: session.contact.name,
      contactPhone: session.contact.phone,
      flows: Array.from(accumulator.flows.values()),
      lastActivity: accumulator.lastActivity.toISOString(),
      lastMessage,
      unreadCount: accumulator.unreadCount,
      messages: sortedMessages,
    });
  }

  summaries.sort(
    (a, b) =>
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime(),
  );

  return summaries;
}

export async function fetchConversationSummariesForUser(
  userId: string,
  options: { take?: number } = {},
): Promise<ConversationSummary[]> {
  const sessions = await prisma.session.findMany({
    where: { flow: { userId } },
    include: {
      contact: { select: { id: true, name: true, phone: true } },
      flow: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: options.take ?? 60,
  });

  return buildConversationSummaries(sessions);
}

export async function fetchConversationByContactId(
  userId: string,
  contactId: string,
): Promise<ConversationSummary | null> {
  const sessions = await prisma.session.findMany({
    where: { flow: { userId }, contactId },
    include: {
      contact: { select: { id: true, name: true, phone: true } },
      flow: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!sessions.length) {
    return null;
  }

  const summaries = buildConversationSummaries(sessions);
  return summaries[0] ?? null;
}
