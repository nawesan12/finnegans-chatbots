"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { leadFocusAreas } from "@/lib/leads";
import { leadFormSchema, type LeadFormValues } from "@/lib/validations/lead";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

type LeadFormState = Omit<LeadFormValues, "focusArea"> & { focusArea: string };

const initialValues: LeadFormState = {
  name: "",
  email: "",
  company: undefined,
  phone: undefined,
  message: "",
  focusArea: "",
};

type FieldErrors = Partial<Record<keyof LeadFormState, string>>;

export function ContactForm() {
  const [values, setValues] = useState<LeadFormState>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof LeadFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setValues((prev) => ({
        ...prev,
        [field]: value,
      }));
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    };

  const handleFocusAreaChange = (value: string) => {
    setValues((prev) => ({
      ...prev,
      focusArea: value,
    }));
    setErrors((prev) => ({
      ...prev,
      focusArea: undefined,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const payload = {
      name: values.name.trim(),
      email: values.email.trim(),
      company: values.company ? values.company.trim() : undefined,
      phone: values.phone ? values.phone.trim() : undefined,
      message: values.message.trim(),
      focusArea: values.focusArea,
    };

    const validation = leadFormSchema.safeParse(payload);

    if (!validation.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of validation.error.issues) {
        const pathKey = issue.path[0];
        if (typeof pathKey === "string" && !(pathKey in fieldErrors)) {
          fieldErrors[pathKey as keyof LeadFormState] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validation.data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message =
          (errorData && typeof errorData.error === "string"
            ? errorData.error
            : null) ?? "No pudimos enviar tu solicitud.";
        toast.error(message);
        return;
      }

      toast.success(
        "¡Gracias! Nuestro equipo se pondrá en contacto en las próximas horas.",
      );
      setValues({ ...initialValues });
      setErrors({});
    } catch (error) {
      console.error("Contact form submission failed", error);
      toast.error("Ocurrió un problema al enviar el formulario.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-[#04102D]/10 bg-[#04102D] p-8 text-white shadow-sm"
    >
      <div className="space-y-2 text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
          Agendá tu workshop
        </p>
        <h3 className="text-2xl font-semibold leading-snug">
          Contanos qué equipos necesitan acompañamiento.
        </h3>
        <p className="text-sm text-white/70">
          Respondemos en menos de 24 h hábiles con un plan de trabajo y próximos pasos.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 text-left">
          <label className="text-sm font-medium text-white" htmlFor="lead-name">
            Nombre y apellido
          </label>
          <Input
            id="lead-name"
            name="name"
            placeholder="María González"
            value={values.name}
            onChange={updateField("name")}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.name)}
            className="h-11 border-white/20 bg-white/5 text-white placeholder:text-white/60 focus:border-[#4BC3FE] focus:text-white focus:ring-[#4BC3FE]/40"
          />
          {errors.name ? (
            <p className="text-xs text-[#4BC3FE]">{errors.name}</p>
          ) : null}
        </div>
        <div className="space-y-2 text-left">
          <label className="text-sm font-medium text-white" htmlFor="lead-email">
            Correo corporativo
          </label>
          <Input
            id="lead-email"
            type="email"
            name="email"
            placeholder="maria@finnegans.com"
            value={values.email}
            onChange={updateField("email")}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.email)}
            className="h-11 border-white/20 bg-white/5 text-white placeholder:text-white/60 focus:border-[#4BC3FE] focus:text-white focus:ring-[#4BC3FE]/40"
          />
          {errors.email ? (
            <p className="text-xs text-[#4BC3FE]">{errors.email}</p>
          ) : null}
        </div>
        <div className="space-y-2 text-left">
          <label className="text-sm font-medium text-white" htmlFor="lead-company">
            Empresa
          </label>
          <Input
            id="lead-company"
            name="company"
            placeholder="Finnegans"
            value={values.company ?? ""}
            onChange={updateField("company")}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.company)}
            className="h-11 border-white/20 bg-white/5 text-white placeholder:text-white/60 focus:border-[#4BC3FE] focus:text-white focus:ring-[#4BC3FE]/40"
          />
          {errors.company ? (
            <p className="text-xs text-[#4BC3FE]">{errors.company}</p>
          ) : null}
        </div>
        <div className="space-y-2 text-left">
          <label className="text-sm font-medium text-white" htmlFor="lead-phone">
            Teléfono de contacto
          </label>
          <Input
            id="lead-phone"
            name="phone"
            placeholder="+54 11 5263-7700"
            value={values.phone ?? ""}
            onChange={updateField("phone")}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.phone)}
            className="h-11 border-white/20 bg-white/5 text-white placeholder:text-white/60 focus:border-[#4BC3FE] focus:text-white focus:ring-[#4BC3FE]/40"
          />
          {errors.phone ? (
            <p className="text-xs text-[#4BC3FE]">{errors.phone}</p>
          ) : null}
        </div>
        <div className="space-y-2 text-left">
          <label className="text-sm font-medium text-white" htmlFor="lead-focus">
            Objetivo principal
          </label>
          <Select
            value={values.focusArea}
            onValueChange={handleFocusAreaChange}
            disabled={isSubmitting}
          >
            <SelectTrigger
              id="lead-focus"
              className="h-11 border-white/20 bg-white/5 text-left text-white focus:border-[#4BC3FE] focus:ring-[#4BC3FE]/40"
              aria-invalid={Boolean(errors.focusArea)}
            >
              <SelectValue placeholder="Elegí un objetivo" />
            </SelectTrigger>
            <SelectContent className="bg-[#04102D] text-white">
              {leadFocusAreas.map((area) => (
                <SelectItem key={area.value} value={area.value}>
                  <div className="space-y-1 text-left">
                    <p className="text-sm font-medium">{area.label}</p>
                    <p className="text-xs text-white/70">{area.description}</p>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.focusArea ? (
            <p className="text-xs text-[#4BC3FE]">{errors.focusArea}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 text-left">
        <label className="text-sm font-medium text-white" htmlFor="lead-message">
          ¿En qué podemos ayudarte?
        </label>
        <Textarea
          id="lead-message"
          name="message"
          placeholder="Queremos automatizar la atención de cobranzas y soporte nivel 1 para Argentina y Chile..."
          value={values.message}
          onChange={updateField("message")}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.message)}
          className="min-h-28 border-white/20 bg-white/5 text-white placeholder:text-white/60 focus:border-[#4BC3FE] focus:text-white focus:ring-[#4BC3FE]/40"
        />
        {errors.message ? (
          <p className="text-xs text-[#4BC3FE]">{errors.message}</p>
        ) : null}
      </div>

      <div className="space-y-3 text-left">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#4BC3FE] px-6 py-3 text-sm font-semibold text-[#04102D] transition hover:bg-[#3EB6F1]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
            </>
          ) : (
            <>
              Enviar propuesta
              <Send className="h-4 w-4" />
            </>
          )}
        </Button>
        <p className="text-xs text-white/60">
          Al enviar tus datos aceptas nuestra política de privacidad y el uso exclusivo de la información para coordinar la demo.
        </p>
      </div>
    </form>
  );
}
