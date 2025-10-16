const SENT_LOG_STATUS_VALUES = [
  "Sent",
  "Delivered",
  "Read",
  "Success",
  "Pending",
  "Warning",
  "Failed",
] as const;

const RECEIVED_LOG_STATUS_VALUES = ["Received"] as const;

export const SENT_LOG_STATUS_SET = new Set<string>(SENT_LOG_STATUS_VALUES);
export const RECEIVED_LOG_STATUS_SET = new Set<string>(
  RECEIVED_LOG_STATUS_VALUES,
);

export const SENT_LOG_STATUSES = Array.from(SENT_LOG_STATUS_SET);
export const RECEIVED_LOG_STATUSES = Array.from(RECEIVED_LOG_STATUS_SET);

export function isSentLogStatus(
  status: string | null | undefined,
): status is string {
  if (!status) {
    return false;
  }

  return SENT_LOG_STATUS_SET.has(status);
}

export function isReceivedLogStatus(
  status: string | null | undefined,
): status is string {
  if (!status) {
    return false;
  }

  return RECEIVED_LOG_STATUS_SET.has(status);
}

