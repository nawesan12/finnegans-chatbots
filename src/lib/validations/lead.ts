import { z } from "zod";

import { leadStatuses, type LeadStatus } from "@/lib/leads";

export const leadFormSchema = z.object({
  name: z
    .string({ message: "Ingresa tu nombre." })
    .trim()
    .min(1, "Ingresa tu nombre.")
    .max(120, "El nombre es demasiado largo."),
  email: z
    .string({ message: "Necesitamos tu correo." })
    .trim()
    .min(1, "Necesitamos tu correo.")
    .max(180, "El correo es demasiado largo.")
    .email("Ingresa un correo válido."),
  company: z
    .string()
    .trim()
    .max(120, "El nombre de la empresa es demasiado largo.")
    .optional()
    .transform((value) => (value ? value : undefined)),
  phone: z
    .string()
    .trim()
    .max(32, "El teléfono es demasiado largo.")
    .optional()
    .transform((value) => (value ? value : undefined)),
  message: z
    .string({ message: "Contanos sobre tu proyecto." })
    .trim()
    .min(1, "Contanos sobre tu proyecto.")
    .max(1000, "El mensaje es demasiado largo."),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;

const leadStatusValues = leadStatuses.map((status) => status.value) as [
  LeadStatus,
  ...LeadStatus[],
];

export const leadManagementSchema = leadFormSchema.extend({
  status: z
    .enum(leadStatusValues)
    .default(leadStatuses[0].value),
  notes: z
    .string()
    .trim()
    .max(2000, "Las notas son demasiado extensas.")
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type LeadManagementValues = z.infer<typeof leadManagementSchema>;
