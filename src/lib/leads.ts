export const leadStatuses = [
  {
    value: "new",
    label: "Nuevo",
    description: "Solicitud entrante pendiente de contacto inicial.",
  },
  {
    value: "contacted",
    label: "Contactado",
    description: "El equipo ya se comunicó y espera respuesta del cliente.",
  },
  {
    value: "qualified",
    label: "Calificado",
    description: "La oportunidad cumple con los criterios para avanzar.",
  },
  {
    value: "archived",
    label: "Archivado",
    description: "El lead no requiere seguimiento adicional por el momento.",
  },
] as const;

export type LeadStatus = (typeof leadStatuses)[number]["value"];

export const leadFocusAreas = [
  {
    value: "support",
    label: "Soporte al cliente",
    description:
      "Prioriza automatizar y escalar respuestas para solicitudes de clientes.",
  },
  {
    value: "sales",
    label: "Ventas y prospección",
    description:
      "Busca acelerar la generación de oportunidades y cierres comerciales.",
  },
  {
    value: "collections",
    label: "Cobranzas y pagos",
    description:
      "Necesita optimizar recordatorios, negociaciones y recuperación de deudas.",
  },
  {
    value: "operations",
    label: "Operaciones internas",
    description:
      "Quiere coordinar workflows entre equipos y sistemas internos.",
  },
  {
    value: "other",
    label: "Otro caso",
    description:
      "Casos especiales que requieren acompañamiento dedicado para definir alcance.",
  },
] as const;

export type LeadFocusArea = (typeof leadFocusAreas)[number]["value"];

const validLeadStatuses = new Set<LeadStatus>(
  leadStatuses.map((status) => status.value),
);

const leadStatusLabelMap = new Map(
  leadStatuses.map((status) => [status.value, status.label] as const),
);

const validLeadFocusAreas = new Set<LeadFocusArea>(
  leadFocusAreas.map((area) => area.value),
);

const leadFocusAreaLabelMap = new Map(
  leadFocusAreas.map((area) => [area.value, area.label] as const),
);
const leadFocusAreaDescriptionMap = new Map(
  leadFocusAreas.map((area) => [area.value, area.description] as const),
);

export function isValidLeadStatus(value: string): value is LeadStatus {
  return validLeadStatuses.has(value as LeadStatus);
}

export function getLeadStatusLabel(status: string): string {
  return leadStatusLabelMap.get(status as LeadStatus) ?? status;
}

export function isValidLeadFocusArea(
  value: string,
): value is LeadFocusArea {
  return validLeadFocusAreas.has(value as LeadFocusArea);
}

export function getLeadFocusAreaLabel(focusArea: string | null | undefined) {
  if (!focusArea) {
    return "";
  }
  return leadFocusAreaLabelMap.get(focusArea as LeadFocusArea) ?? focusArea;
}

export function getLeadFocusAreaDescription(
  focusArea: string | null | undefined,
) {
  if (!focusArea) {
    return "";
  }
  return (
    leadFocusAreaDescriptionMap.get(focusArea as LeadFocusArea) ?? focusArea
  );
}

type LeadForExport = {
  name: string | null;
  email: string;
  company: string | null;
  phone: string | null;
  status: string;
  focusArea: string | null;
  message: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const DEFAULT_EXPORT_LOCALE = "es-AR";

function sanitizeCsvValue(value: string) {
  return value.replace(/\r?\n|\r/g, " ").replace(/"/g, '""');
}

export function formatLeadsAsCsv(
  leads: LeadForExport[],
  options?: { locale?: string },
): string {
  const locale = options?.locale ?? DEFAULT_EXPORT_LOCALE;
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const headers = [
    "Nombre",
    "Correo",
    "Empresa",
    "Teléfono",
    "Estado",
    "Necesidad principal",
    "Mensaje",
    "Notas",
    "Recibido",
    "Actualizado",
  ];

  const rows = leads.map((lead) => [
    lead.name ?? "",
    lead.email,
    lead.company ?? "",
    lead.phone ?? "",
    getLeadStatusLabel(lead.status),
    getLeadFocusAreaLabel(lead.focusArea),
    lead.message,
    lead.notes ?? "",
    dateFormatter.format(lead.createdAt),
    dateFormatter.format(lead.updatedAt),
  ]);

  const toCsvRow = (values: string[]) =>
    values.map((value) => `"${sanitizeCsvValue(value)}"`).join(",");

  const csvContent = [headers, ...rows].map(toCsvRow).join("\r\n");
  return `\ufeff${csvContent}`;
}
