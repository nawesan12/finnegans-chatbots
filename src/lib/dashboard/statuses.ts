const SENT_LOG_STATUS_VALUES = [
  "Completed",
  "Sent",
  "Delivered",
  "Success",
] as const;

export const SENT_LOG_STATUS_SET = new Set<string>(SENT_LOG_STATUS_VALUES);

export const SENT_LOG_STATUSES = Array.from(SENT_LOG_STATUS_SET);

export function isSentLogStatus(
  status: string | null | undefined,
): status is string {
  if (!status) {
    return false;
  }

  return SENT_LOG_STATUS_SET.has(status);
}

