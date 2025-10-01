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

const validLeadStatuses = new Set<LeadStatus>(
  leadStatuses.map((status) => status.value),
);

const leadStatusLabelMap = new Map(
  leadStatuses.map((status) => [status.value, status.label] as const),
);

export function isValidLeadStatus(value: string): value is LeadStatus {
  return validLeadStatuses.has(value as LeadStatus);
}

export function getLeadStatusLabel(status: string): string {
  return leadStatusLabelMap.get(status as LeadStatus) ?? status;
}

type LeadForExport = {
  name: string | null;
  email: string;
  company: string | null;
  phone: string | null;
  status: string;
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
