"use client";

import { useAuthStore } from "@/lib/store";

class UnauthorizedError extends Error {
  constructor(message?: string) {
    super(message ?? "Tu sesión expiró. Por favor vuelve a iniciar sesión.");
    this.name = "UnauthorizedError";
  }
}

let redirectScheduled = false;

if (typeof window !== "undefined") {
  useAuthStore.subscribe(
    (state) => state.token,
    () => {
      redirectScheduled = false;
    },
  );
}

function scheduleRedirect() {
  if (typeof window === "undefined") {
    return;
  }

  if (redirectScheduled) {
    return;
  }

  redirectScheduled = true;
  window.dispatchEvent(new CustomEvent("auth:unauthorized"));
  window.setTimeout(() => {
    window.location.href = "/login";
  }, 150);
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const { token, logout } = useAuthStore.getState();
  const headers = new Headers(init.headers ?? {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, { ...init, headers });

  if (response.status === 401) {
    logout();
    scheduleRedirect();
    throw new UnauthorizedError();
  }

  return response;
}

export { UnauthorizedError };
