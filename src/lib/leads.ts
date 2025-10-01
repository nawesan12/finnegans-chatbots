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

export function isValidLeadStatus(value: string): value is LeadStatus {
  return validLeadStatuses.has(value as LeadStatus);
}
