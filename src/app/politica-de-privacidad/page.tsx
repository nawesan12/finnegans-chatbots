import type { Metadata } from "next";
import Link from "next/link";

import { MarketingFooter } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Política de Privacidad | Finnegans Chatbots",
  description:
    "Conocé cómo Finnegans Chatbots gestiona, protege y utiliza los datos personales en cumplimiento con la normativa vigente en Latinoamérica.",
};

type PolicySection = {
  title: string;
  paragraphs: readonly string[];
  items?: readonly string[];
};

const policySections = [
  {
    title: "1. Responsable del tratamiento",
    paragraphs: [
      "Finnegans S.A., con domicilio en Av. del Libertador 2442, Ciudad Autónoma de Buenos Aires, Argentina, es la responsable del tratamiento de los datos personales vinculados a la plataforma Finnegans Chatbots.",
      "Podés contactarnos por correo electrónico en hello@finnegans.com o al teléfono +54 11 5263-7700 para realizar cualquier consulta relacionada con esta política.",
    ],
  },
  {
    title: "2. Datos que recolectamos",
    paragraphs: [
      "Recolectamos únicamente la información necesaria para proveer y mejorar nuestros servicios conversacionales.",
    ],
    items: [
      "Datos de identificación y contacto de clientes y usuarios autorizados (nombre, correo, teléfono, cargo).",
      "Credenciales y metadatos necesarios para administrar accesos seguros y auditar el uso de la plataforma.",
      "Historial de interacciones, etiquetas y anotaciones creadas por tus equipos para entrenar y mejorar los flujos conversacionales.",
      "Registros técnicos (logs) que permiten garantizar la continuidad operativa, detectar incidentes y cumplir con auditorías regulatorias.",
    ],
  },
  {
    title: "3. Finalidades del tratamiento",
    paragraphs: [
      "Utilizamos los datos personales para cumplir con los siguientes objetivos legítimos y necesarios:",
    ],
    items: [
      "Configurar, operar y personalizar los bots, canales y tableros asociados a tu organización.",
      "Brindar soporte técnico, capacitación y comunicación proactiva sobre mejoras de producto.",
      "Generar métricas, reportes y análisis de performance solicitados por tu organización.",
      "Cumplir obligaciones contractuales, contables, fiscales y regulatorias aplicables en las jurisdicciones donde operamos.",
    ],
  },
  {
    title: "4. Bases legales",
    paragraphs: [
      "Tratamos los datos personales en función de la ejecución de contratos suscriptos con nuestros clientes, el cumplimiento de obligaciones legales y el interés legítimo de mantener la seguridad y mejora continua del servicio.",
    ],
  },
  {
    title: "5. Conservación de la información",
    paragraphs: [
      "Los datos se almacenan durante la vigencia de la relación comercial y mientras sean necesarios para cumplir obligaciones legales o contractuales. Una vez transcurridos esos plazos, aplicamos procesos de anonimización o eliminación segura conforme a nuestras políticas internas y normas ISO 27001.",
    ],
  },
  {
    title: "6. Transferencias y terceros",
    paragraphs: [
      "Podemos compartir datos con proveedores tecnológicos que nos ayudan a operar la infraestructura, exclusivamente bajo acuerdos de confidencialidad y protección de datos.",
      "Cuando la prestación del servicio implique transferencias internacionales, verificamos que existan salvaguardas adecuadas y cumplimos con los requisitos normativos de cada país.",
    ],
  },
  {
    title: "7. Derechos de los titulares",
    paragraphs: [
      "Los usuarios pueden ejercer los derechos de acceso, rectificación, actualización, cancelación, oposición y portabilidad en cualquier momento.",
    ],
    items: [
      "Envianos un correo a hello@finnegans.com indicando la solicitud específica y acreditando tu identidad.",
      "Respondemos dentro de los plazos previstos por la normativa local y facilitamos canales seguros para entregar la información.",
    ],
  },
  {
    title: "8. Seguridad de la información",
    paragraphs: [
      "Implementamos controles de seguridad administrativos, técnicos y físicos alineados a estándares internacionales (ISO 27001, SOC 2) para proteger los datos frente a accesos no autorizados, pérdida o alteración.",
      "Realizamos auditorías periódicas, monitoreo continuo y programas de concientización para nuestros equipos internos y socios estratégicos.",
    ],
  },
  {
    title: "9. Actualizaciones de la política",
    paragraphs: [
      "Revisamos y actualizamos esta política cuando introducimos nuevas funcionalidades, cumplimos requerimientos regulatorios o mejoramos nuestros procesos internos.",
      "Te notificaremos a través de los canales acordados con tu organización cuando existan cambios sustanciales.",
    ],
  },
  {
    title: "10. Contacto",
    paragraphs: [
      "Si tenés preguntas adicionales, inquietudes o reclamos relacionados con esta política, podés escribirnos a hello@finnegans.com o completar el formulario de contacto disponible en nuestro sitio.",
    ],
  },
] as const satisfies readonly PolicySection[];

export default function PoliticaDePrivacidadPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#04102D]/5 text-[#04102D]">
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-[#04102D]/10 bg-white">
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#4BC3FE20,_transparent_70%)]"
            aria-hidden="true"
          />
          <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-20 sm:py-24">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#04102D]/15 bg-[#04102D]/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[#04102D]/70">
              Legal · Actualizado enero 2025
            </span>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Política de privacidad
            </h1>
            <p className="max-w-2xl text-lg text-[#04102D]/70">
              Esta política describe cómo Finnegans Chatbots recopila, utiliza y protege los datos personales que nos confiás para
              operar tus experiencias conversacionales.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-[#04102D]/60">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#04102D]/5 px-3 py-1 font-medium">
                Cumplimiento regional LATAM
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#04102D]/5 px-3 py-1 font-medium">
                ISO 27001 · SOC 2 ready
              </span>
              <Link
                href="#derechos"
                className="inline-flex items-center gap-2 rounded-full border border-[#04102D]/20 px-3 py-1 font-medium text-[#04102D]/70 transition hover:border-[#04102D]/40 hover:text-[#04102D]"
              >
                ¿Cómo ejercés tus derechos?
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-16 sm:py-20">
          {policySections.map((section) => (
            <article
              key={section.title}
              id={section.title.startsWith("7.") ? "derechos" : undefined}
              className="space-y-4 rounded-3xl border border-[#04102D]/10 bg-white/80 p-8 shadow-sm backdrop-blur"
            >
              <h2 className="text-2xl font-semibold text-[#04102D]">{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-base leading-relaxed text-[#04102D]/70">
                  {paragraph}
                </p>
              ))}
              {"items" in section ? (
                <ul className="list-disc space-y-2 pl-6 text-[#04102D]/70">
                  {section.items?.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </section>
      </main>

      <MarketingFooter variant="light" />
    </div>
  );
}
