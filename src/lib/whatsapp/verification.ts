import prisma from "@/lib/prisma";
import { graphRequest } from "@/lib/whatsapp/meta-graph";
import type {
  MetaVerificationResult,
  MetaVerificationStep,
} from "@/lib/whatsapp/verification-types";

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
