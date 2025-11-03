import { GRAPH_VERSION, META_API_TIMEOUT_MS } from "@/lib/whatsapp/config";

const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

export type GraphRequestResult = {
  ok: boolean;
  status: number;
  json?: unknown;
  text?: string;
  errorMessage?: string;
  aborted?: boolean;
};

export function buildGraphUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const trimmed = path.replace(/^\/+/, "");
  return `${GRAPH_BASE_URL}/${trimmed}`;
}

export function extractGraphErrorMessage(json: unknown): string | undefined {
  if (
    typeof json !== "object" ||
    json === null ||
    !("error" in json) ||
    typeof (json as { error?: unknown }).error !== "object" ||
    (json as { error?: unknown }).error === null
  ) {
    return undefined;
  }

  const error = (json as { error: Record<string, unknown> }).error;

  if (typeof error.error_user_msg === "string" && error.error_user_msg.trim()) {
    return error.error_user_msg.trim();
  }

  if (typeof error.message === "string" && error.message.trim()) {
    return error.message.trim();
  }

  return undefined;
}

export async function graphRequest(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<GraphRequestResult> {
  const url = buildGraphUrl(path);
  const headers = new Headers(init.headers);

  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), META_API_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
    });

    const text = await response.text().catch(() => "");
    let json: unknown;

    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = undefined;
      }
    }

    const errorMessage = response.ok
      ? undefined
      : (extractGraphErrorMessage(json) ?? text) || response.statusText || undefined;

    return {
      ok: response.ok,
      status: response.status,
      json,
      text,
      errorMessage,
    };
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    const message = isAbort
      ? "La solicitud a Meta tardó demasiado. Intenta nuevamente."
      : error instanceof Error
        ? error.message
        : "Error inesperado al comunicar con Meta.";

    return {
      ok: false,
      status: isAbort ? 408 : 500,
      errorMessage: message,
      aborted: isAbort,
    };
  } finally {
    clearTimeout(timeout);
  }
}
