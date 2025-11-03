import prisma from "@/lib/prisma";
import { graphRequest } from "@/lib/whatsapp/meta-graph";

export class MetaPhoneNumberError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, options?: { status?: number; details?: unknown }) {
    super(message);
    this.name = "MetaPhoneNumberError";
    this.status = options?.status ?? 500;
    this.details = options?.details;
  }
}

type VerificationMethod = "sms" | "voice";

type RequestCodeOptions = {
  method: VerificationMethod;
  locale?: string | null;
};

type RequestCodeResult = {
  message: string;
  expiresInMinutes?: number | null;
};

type VerifyCodeResult = {
  message: string;
};

function normalizeLocale(input?: string | null): string | undefined {
  if (!input) {
    return undefined;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return undefined;
  }

  const sanitized = trimmed.replace(/-/g, "_");
  const [language, region] = sanitized.split("_");

  if (!language) {
    return undefined;
  }

  const normalizedLanguage = language.toLowerCase();
  const normalizedRegion = region ? region.toUpperCase() : undefined;

  return normalizedRegion
    ? `${normalizedLanguage}_${normalizedRegion}`
    : normalizedLanguage;
}

function normalizeMethod(method: VerificationMethod): "SMS" | "VOICE" {
  return method === "voice" ? "VOICE" : "SMS";
}

function ensureUserCredentials({
  accessToken,
  phoneNumberId,
}: {
  accessToken: string | null;
  phoneNumberId: string | null;
}) {
  const missing: string[] = [];

  if (!accessToken?.trim()) {
    missing.push("Access Token");
  }

  if (!phoneNumberId?.trim()) {
    missing.push("Phone Number ID");
  }

  if (missing.length > 0) {
    throw new MetaPhoneNumberError(
      `Configura ${missing.join(", ")} en Ajustes → WhatsApp Cloud para continuar.`,
      { status: 400 },
    );
  }
}

export async function requestMetaPhoneVerificationCode(
  userId: string,
  options: RequestCodeOptions,
): Promise<RequestCodeResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { metaAccessToken: true, metaPhoneNumberId: true },
  });

  if (!user) {
    throw new MetaPhoneNumberError("User not found", { status: 404 });
  }

  ensureUserCredentials({
    accessToken: user.metaAccessToken,
    phoneNumberId: user.metaPhoneNumberId,
  });

  const accessToken = user.metaAccessToken!.trim();
  const phoneNumberId = user.metaPhoneNumberId!.trim();
  const locale = normalizeLocale(options.locale);

  const body: Record<string, string> = {
    code_method: normalizeMethod(options.method),
  };

  if (locale) {
    body.locale = locale;
  }

  const response = await graphRequest(
    `${phoneNumberId}/request_code`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new MetaPhoneNumberError(
      response.errorMessage ??
        "No se pudo solicitar el código de verificación en Meta.",
      {
        status: response.status,
        details: response.json ?? response.text,
      },
    );
  }

  const data = response.json as
    | { success?: unknown; code_expiration_in_minutes?: unknown }
    | undefined;

  const expiresInMinutes =
    typeof data?.code_expiration_in_minutes === "number"
      ? data.code_expiration_in_minutes
      : null;

  const message = data?.success === false
    ? "Meta respondió que no pudo enviar el código de verificación."
    : options.method === "voice"
      ? "Solicitamos una llamada de voz con el código de verificación."
      : "Solicitamos un SMS con el código de verificación.";

  return { message, expiresInMinutes };
}

export async function verifyMetaPhoneVerificationCode(
  userId: string,
  code: string,
): Promise<VerifyCodeResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { metaAccessToken: true, metaPhoneNumberId: true },
  });

  if (!user) {
    throw new MetaPhoneNumberError("User not found", { status: 404 });
  }

  ensureUserCredentials({
    accessToken: user.metaAccessToken,
    phoneNumberId: user.metaPhoneNumberId,
  });

  const trimmedCode = code.trim();
  if (!trimmedCode) {
    throw new MetaPhoneNumberError("Ingresa el código de verificación recibido por Meta.", {
      status: 400,
    });
  }

  const accessToken = user.metaAccessToken!.trim();
  const phoneNumberId = user.metaPhoneNumberId!.trim();

  const response = await graphRequest(
    `${phoneNumberId}/verify_code`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({ code: trimmedCode }),
    },
  );

  if (!response.ok) {
    throw new MetaPhoneNumberError(
      response.errorMessage ??
        "El código enviado no es válido o expiró. Solicita uno nuevo e inténtalo otra vez.",
      {
        status: response.status,
        details: response.json ?? response.text,
      },
    );
  }

  const data = response.json as { success?: unknown } | undefined;
  const message = data?.success === false
    ? "Meta rechazó el código enviado. Verifica los dígitos e inténtalo nuevamente."
    : "Código validado correctamente en Meta Cloud.";

  return { message };
}
