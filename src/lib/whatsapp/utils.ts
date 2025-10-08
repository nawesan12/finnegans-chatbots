import type { Flow } from "@prisma/client";
import type { FlowMatchContext, WAStatusError } from "./types";

export const toLcTrim = (s?: string) => (s ?? "").trim().toLowerCase();

export const normalizePhone = (value?: string | null): string | null => {
  if (!value) return null;
  const digits = value.replace(/[^0-9]/g, "");
  return digits.length ? digits : null;
};

const stripDiacritics = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const normalizeTrigger = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return stripDiacritics(trimmed).toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
};

export const isWhatsappChannel = (channel?: string | null): boolean => {
  if (channel === null || channel === undefined) return true;
  const trimmed = channel.trim();
  if (!trimmed) return true;
  return trimmed.toLowerCase() === "whatsapp";
};

const collectKeywordCandidates = (
  text: string | null,
  interactiveTitle: string | null,
  interactiveId: string | null,
) => {
  const candidates = new Set<string>();
  const push = (value: string | null) => {
    const normalized = normalizeTrigger(value);
    if (!normalized) return;
    candidates.add(normalized);
    for (const part of normalized.split(/\s+/u)) {
      if (part) candidates.add(part);
    }
  };
  push(text);
  push(interactiveTitle);
  push(interactiveId);
  return candidates;
};

export const findBestMatchingFlow = (
  flows: Flow[],
  context: FlowMatchContext,
) => {
  if (!flows.length) return null;

  const keywordCandidates = collectKeywordCandidates(
    context.fullText,
    context.interactiveTitle,
    context.interactiveId,
  );
  const normalizedText = normalizeTrigger(context.fullText);
  const normalizedInteractiveTitle = normalizeTrigger(context.interactiveTitle);
  const normalizedInteractiveId = normalizeTrigger(context.interactiveId);

  let bestFlow: Flow | null = null;
  let bestScore = -1;

  for (const flow of flows) {
    const normalizedTrigger = normalizeTrigger(flow.trigger);
    const isDefaultTrigger = normalizedTrigger === "default";
    let matchesTrigger = false;

    if (normalizedTrigger && !isDefaultTrigger) {
      if (keywordCandidates.has(normalizedTrigger)) matchesTrigger = true;
      else if (normalizedText?.includes(normalizedTrigger))
        matchesTrigger = true;
      else if (normalizedInteractiveTitle?.includes(normalizedTrigger))
        matchesTrigger = true;
      else if (normalizedInteractiveId === normalizedTrigger)
        matchesTrigger = true;
    }

    let score = 0;
    if (matchesTrigger) {
      score += 6;
      if (normalizedText === normalizedTrigger) score += 2;
      if (normalizedInteractiveTitle === normalizedTrigger) score += 1;
      if (normalizedInteractiveId === normalizedTrigger) score += 1;
    }
    if (!matchesTrigger && isDefaultTrigger) score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestFlow = flow;
    }
  }
  return bestFlow ?? flows[0] ?? null;
};

export const WHATSAPP_STATUS_MAP: Record<string, string> = {
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Failed",
  undelivered: "Failed",
  deleted: "Failed",
  warning: "Warning",
  pending: "Pending",
  queued: "Pending",
};

export function mapWhatsappStatus(rawStatus?: string | null): string | null {
  if (!rawStatus) return null;
  const normalized = rawStatus.trim().toLowerCase();
  return WHATSAPP_STATUS_MAP[normalized] ?? null;
}

export function extractStatusError(errors?: WAStatusError[] | null): string | null {
  if (!errors?.length) return null;
  const [first] = errors;
  if (!first) return null;
  const details = first.error_data?.details;
  if (details) return details;
  return first.message || first.title || `Error code ${first.code}`;
}

export function parseStatusTimestamp(timestamp?: string | null): Date | null {
  if (!timestamp) return null;
  const numeric = Number(timestamp);
  if (Number.isFinite(numeric)) return new Date(numeric * 1000);
  return null;
}