import prisma from "@/lib/prisma";
import {
  GRAPH_VERSION,
  META_API_TIMEOUT_MS,
} from "@/lib/whatsapp/config";
import type {
  MetaVerificationResult,
  MetaVerificationStep,
} from "@/lib/whatsapp/verification-types";

const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

function buildGraphUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const trimmed = path.replace(/^\/+/, "");
  return `${GRAPH_BASE_URL}/${trimmed}`;
}

type GraphRequestResult = {
  ok: boolean;
  status: number;
  json?: unknown;
  text?: string;
  errorMessage?: string;
  aborted?: boolean;
};

function extractGraphErrorMessage(json: unknown): string | undefined {
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

async function graphRequest(
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
      : extractGraphErrorMessage(json) ?? text || response.statusText || undefined;

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

function createStep(
  overrides: Partial<MetaVerificationStep> & { key: string; label: string },
): MetaVerificationStep {
  return {
    status: "success",
    message: "",
    ...overrides,
  } satisfies MetaVerificationStep;
}

async function checkPhoneNumber(
  accessToken: string,
  phoneNumberId: string,
): Promise<MetaVerificationStep> {
  const response = await graphRequest(
    `${phoneNumberId}?fields=display_phone_number,verified_name`,
    accessToken,
  );

  if (!response.ok) {
    return createStep({
      key: "graph",
      label: "Conexión con Meta Graph",
      status: "error",
      message:
        response.errorMessage ??
        "No se pudo validar el número en Meta. Revisa el token y los permisos.",
    });
  }

  const data = (response.json ?? {}) as {
    display_phone_number?: unknown;
    verified_name?: unknown;
  };

  const display =
    typeof data.display_phone_number === "string" && data.display_phone_number.trim()
      ? data.display_phone_number.trim()
      : phoneNumberId;
  const verifiedName =
    typeof data.verified_name === "string" && data.verified_name.trim()
      ? data.verified_name.trim()
      : null;

  const details: string[] = [`El número ${display} respondió correctamente.`];

  if (verifiedName) {
    details.push(`Nombre verificado: ${verifiedName}.`);
  }

  return createStep({
    key: "graph",
    label: "Conexión con Meta Graph",
    status: "success",
    message: details.join(" "),
  });
}
async function registerPhoneNumber(
  accessToken: string,
  phoneNumberId: string,
  pin: string,
): Promise<MetaVerificationStep> {
  const response = await graphRequest(
    `${phoneNumberId}/register`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        pin,
      }),
    },
  );

  if (response.ok) {
    return createStep({
      key: "registration",
      label: "Registro del número",
      status: "success",
      message: "Registramos el número en Meta con el PIN configurado.",
    });
  }

  const normalizedMessage = response.errorMessage?.toLowerCase() ?? "";

  if (response.status === 409 || normalizedMessage.includes("already")) {
    return createStep({
      key: "registration",
      label: "Registro del número",
      status: "success",
      message: "El número ya estaba registrado en Meta.",
    });
  }

  return createStep({
    key: "registration",
    label: "Registro del número",
    status: "error",
    message:
      response.errorMessage ??
      "No se pudo registrar el número con el PIN proporcionado. Verifica el código.",
  });
}

async function checkBusinessAccount(
  accessToken: string,
  businessAccountId: string,
): Promise<MetaVerificationStep> {
  const response = await graphRequest(
    `${businessAccountId}?fields=name,account_review_status`,
    accessToken,
  );

  if (!response.ok) {
    return createStep({
      key: "businessAccount",
      label: "WhatsApp Business Account",
      status: "error",
      message:
        response.errorMessage ??
        "No se pudo acceder a la cuenta de WhatsApp Business con el token actual.",
    });
  }

  const data = (response.json ?? {}) as {
    name?: unknown;
    account_review_status?: unknown;
  };

  const name = typeof data.name === "string" && data.name.trim() ? data.name.trim() : null;
  const reviewStatus =
    typeof data.account_review_status === "string" && data.account_review_status.trim()
      ? data.account_review_status.trim()
      : null;

  const fragments: string[] = [
    "La cuenta de WhatsApp Business respondió correctamente.",
  ];

  if (name) {
    fragments.push(`Nombre: ${name}.`);
  }

  if (reviewStatus) {
    fragments.push(`Estado de revisión: ${reviewStatus}.`);
  }

  return createStep({
    key: "businessAccount",
    label: "WhatsApp Business Account",
    status: "success",
    message: fragments.join(" "),
  });
}

function summarizeSteps(steps: MetaVerificationStep[]): {
  success: boolean;
  hasWarnings: boolean;
} {
  const success = !steps.some((item) => item.status === "error");
  const hasWarnings = steps.some((item) => item.status === "warning");
  return { success, hasWarnings };
}
export class MetaVerificationError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, options?: { status?: number; details?: unknown }) {
    super(message);
    this.name = "MetaVerificationError";
    this.status = options?.status ?? 500;
    this.details = options?.details;
  }
}

export async function verifyMetaAccount(
  userId: string,
): Promise<MetaVerificationResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      metaVerifyToken: true,
      metaAppSecret: true,
      metaAccessToken: true,
      metaPhoneNumberId: true,
      metaBusinessAccountId: true,
      metaPhonePin: true,
    },
  });

  if (!user) {
    throw new MetaVerificationError("User not found", { status: 404 });
  }

  const verifyToken = user.metaVerifyToken?.trim() ?? "";
  const appSecret = user.metaAppSecret?.trim() ?? "";
  const accessToken = user.metaAccessToken?.trim() ?? "";
  const phoneNumberId = user.metaPhoneNumberId?.trim() ?? "";
  const businessAccountId = user.metaBusinessAccountId?.trim() ?? "";
  const phonePin = user.metaPhonePin?.trim() ?? "";

  const steps: MetaVerificationStep[] = [];

  const missingCredentials: string[] = [];
  if (!appSecret) missingCredentials.push("App Secret");
  if (!accessToken) missingCredentials.push("Access Token");
  if (!phoneNumberId) missingCredentials.push("Phone Number ID");
  if (!verifyToken) missingCredentials.push("Verify Token");

  if (missingCredentials.length > 0) {
    steps.push(
      createStep({
        key: "credentials",
        label: "Credenciales obligatorias",
        status: "error",
        message: `Configura ${missingCredentials.join(", ")} en Ajustes → WhatsApp Cloud para continuar.`,
      }),
    );

    if (!phonePin) {
      steps.push(
        createStep({
          key: "registration",
          label: "Registro del número",
          status: "warning",
          message:
            "Carga el PIN de registro provisto por Meta para habilitar la inscripción automática del número.",
        }),
      );
    }

    if (!businessAccountId) {
      steps.push(
        createStep({
          key: "businessAccount",
          label: "WhatsApp Business Account",
          status: "warning",
          message: "Agrega el Business Account ID para habilitar métricas opcionales.",
        }),
      );
    }

    const summary = summarizeSteps(steps);
    return {
      ...summary,
      checkedAt: new Date().toISOString(),
      steps,
    };
  }

  steps.push(
    createStep({
      key: "credentials",
      label: "Credenciales obligatorias",
      status: "success",
      message:
        "App Secret, Verify Token, Access Token y Phone Number ID están configurados.",
    }),
  );

  const graphStep = await checkPhoneNumber(accessToken, phoneNumberId);
  steps.push(graphStep);

  if (graphStep.status === "error") {
    const summary = summarizeSteps(steps);
    return {
      ...summary,
      checkedAt: new Date().toISOString(),
      steps,
    };
  }

  if (!phonePin) {
    steps.push(
      createStep({
        key: "registration",
        label: "Registro del número",
        status: "warning",
        message:
          "Agrega el PIN de registro en Ajustes → WhatsApp Cloud para registrar el número automáticamente.",
      }),
    );
  } else {
    const registrationStep = await registerPhoneNumber(
      accessToken,
      phoneNumberId,
      phonePin,
    );
    steps.push(registrationStep);

    if (registrationStep.status === "error") {
      const summary = summarizeSteps(steps);
      return {
        ...summary,
        checkedAt: new Date().toISOString(),
        steps,
      };
    }
  }

  if (businessAccountId) {
    const businessStep = await checkBusinessAccount(accessToken, businessAccountId);
    steps.push(businessStep);
  } else {
    steps.push(
      createStep({
        key: "businessAccount",
        label: "WhatsApp Business Account",
        status: "warning",
        message: "Agrega el Business Account ID para habilitar métricas opcionales.",
      }),
    );
  }

  const summary = summarizeSteps(steps);

  return {
    ...summary,
    checkedAt: new Date().toISOString(),
    steps,
  };
}
