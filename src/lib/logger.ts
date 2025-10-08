import { NextRequest } from "next/server";

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

function createJsonLogger() {
  const log = (
    level: LogLevel,
    message: string,
    details?: Record<string, unknown>,
    request?: NextRequest,
  ) => {
    const entry: LogEntry = {
      level,
      message,
      details,
      timestamp: new Date().toISOString(),
    };

    if (request) {
      entry.requestId = request.headers.get("x-vercel-id") ?? undefined;
      const forwardedFor = request.headers.get("x-forwarded-for") ?? undefined;
      entry.ip = forwardedFor?.split(",")[0]?.trim() ?? undefined;
      entry.userAgent = request.headers.get("user-agent") ?? undefined;
    }

    const output = JSON.stringify(entry);

    switch (level) {
      case "info":
        console.log(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "error":
        console.error(output);
        break;
    }
  };

  return {
    info: (
      message: string,
      details?: Record<string, unknown>,
      request?: NextRequest,
    ) => log("info", message, details, request),
    warn: (
      message: string,
      details?: Record<string, unknown>,
      request?: NextRequest,
    ) => log("warn", message, details, request),
    error: (
      message: string,
      details?: Record<string, unknown>,
      request?: NextRequest,
    ) => log("error", message, details, request),
  };
}

export const logger = createJsonLogger();