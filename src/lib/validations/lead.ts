import { z } from "zod";

import { leadFocusAreas } from "@/lib/leads";

const focusAreaValues = leadFocusAreas.map((area) => area.value);

if (focusAreaValues.length === 0) {
  throw new Error("leadFocusAreas must contain at least one option");
}

export const leadFormSchema = z.object({
  name: z
    .string({ message: "Ingresá tu nombre." })
    .trim()
    .min(1, "Ingresá tu nombre.")
    .max(120, "El nombre es demasiado largo."),
  email: z
    .string({ message: "Necesitamos tu correo." })
    .trim()
    .min(1, "Necesitamos tu correo.")
    .max(180, "El correo es demasiado largo.")
    .email("Ingresá un correo válido."),
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
  focusArea: z.enum([focusAreaValues[0], ...focusAreaValues.slice(1)], {
    message: "Elegí el objetivo principal de tu proyecto.",
  }),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;
