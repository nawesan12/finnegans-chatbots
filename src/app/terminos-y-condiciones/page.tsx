import type { Metadata } from "next";
import Link from "next/link";

import { MarketingFooter } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Términos y Condiciones | Finnegans Chatbots",
  description:
    "Revisá las condiciones de uso y obligaciones contractuales para operar Finnegans Chatbots en tu organización.",
};

const termsSections = [
  {
    title: "1. Aceptación de las condiciones",
    paragraphs: [
      "Al crear una cuenta o ingresar a la plataforma Finnegans Chatbots confirmás que tenés facultades para contratar en nombre de tu organización y que aceptás los presentes Términos y Condiciones.",
      "Si no estás de acuerdo con algún punto, no deberás utilizar el servicio. El acceso continuado implicará la aceptación plena de la última versión publicada.",
    ],
  },
  {
    title: "2. Alcance del servicio",
    paragraphs: [
      "Finnegans Chatbots permite diseñar, operar y monitorear experiencias conversacionales en distintos canales digitales, incluyendo integraciones con plataformas de mensajería y sistemas internos.",
      "Las funcionalidades disponibles dependerán del plan contratado y podrán actualizarse o ampliarse conforme avance el roadmap del producto.",
    ],
  },
  {
    title: "3. Cuentas de usuario y seguridad",
    paragraphs: [
      "Cada persona autorizada debe contar con credenciales individuales y mantenerlas confidenciales.",
      "Sos responsable de toda actividad realizada con tus accesos. Notificanos inmediatamente ante cualquier uso no autorizado o incidente de seguridad.",
    ],
  },
  {
    title: "4. Contenidos y confidencialidad",
    paragraphs: [
      "Tu organización conserva la titularidad sobre los datos y contenidos que se procesan a través de la plataforma.",
      "Nos comprometemos a resguardar la información conforme a nuestra Política de Privacidad y a los acuerdos de confidencialidad vigentes.",
    ],
  },
  {
    title: "5. Responsabilidades del cliente",
    paragraphs: [
      "Debés asegurarte de que el uso de Finnegans Chatbots cumpla con las normas aplicables en las jurisdicciones donde operás (protección de datos, consumo, comunicaciones, propiedad intelectual, entre otras).",
      "También debés garantizar que los contenidos y automatizaciones no vulneren derechos de terceros ni sean utilizados para actividades ilícitas.",
    ],
  },
  {
    title: "6. Disponibilidad y soporte",
    paragraphs: [
      "Trabajamos para mantener un nivel de servicio acorde a estándares empresariales. Podrán existir interrupciones programadas por mantenimiento, de las cuales daremos aviso en los canales acordados.",
      "Brindamos soporte de acuerdo con el plan contratado y priorizamos incidentes críticos según su impacto operacional.",
    ],
  },
  {
    title: "7. Limitación de responsabilidad",
    paragraphs: [
      "En la máxima medida permitida por la ley, Finnegans S.A. no será responsable por daños indirectos, lucro cesante o pérdida de oportunidades derivadas del uso o imposibilidad de uso del servicio.",
      "Nuestra responsabilidad directa se limitará al monto efectivamente abonado por el cliente durante los doce (12) meses anteriores al evento que origine el reclamo.",
    ],
  },
  {
    title: "8. Suspensión y terminación",
    paragraphs: [
      "Podemos suspender o finalizar el acceso si detectamos incumplimientos graves a estos términos, actividades fraudulentas o riesgos de seguridad.",
      "Podés solicitar la baja del servicio en cualquier momento notificándonos por escrito con al menos treinta (30) días de antelación.",
    ],
  },
  {
    title: "9. Propiedad intelectual",
    paragraphs: [
      "Finnegans S.A. mantiene todos los derechos de propiedad intelectual sobre la plataforma, documentación y materiales asociados.",
      "Solo otorgamos licencias de uso no exclusivas, intransferibles y limitadas a la duración del contrato.",
    ],
  },
  {
    title: "10. Actualizaciones de los términos",
    paragraphs: [
      "Podemos modificar estos Términos y Condiciones para reflejar cambios legales, operativos o de producto.",
      "Te notificaremos con una antelación razonable cuando las modificaciones sean sustanciales. Continuar utilizando el servicio después de dicha notificación implica la aceptación de las nuevas condiciones.",
    ],
  },
  {
    title: "11. Ley aplicable y jurisdicción",
    paragraphs: [
      "Estos términos se regirán por las leyes de la República Argentina. Las controversias se someterán a los tribunales ordinarios con sede en la Ciudad Autónoma de Buenos Aires, renunciando a cualquier otro fuero o jurisdicción.",
    ],
  },
  {
    title: "12. Contacto",
    paragraphs: [
      "Para consultas contractuales o notificaciones podés escribirnos a hello@finnegans.com o comunicarte a +54 11 5263-7700.",
      "También podés revisar nuestra {policiesLink} para conocer más sobre el tratamiento de datos personales.",
    ],
  },
] as const;

export default function TerminosYCondicionesPage() {
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
              Legal · Vigentes enero 2025
            </span>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Términos y Condiciones de uso
            </h1>
            <p className="max-w-2xl text-lg text-[#04102D]/70">
              Estas condiciones regulan el uso de la plataforma Finnegans Chatbots y forman parte del acuerdo entre Finnegans S.A. y tu organización.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-[#04102D]/60">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#04102D]/5 px-3 py-1 font-medium">
                Enfoque enterprise
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#04102D]/5 px-3 py-1 font-medium">
                SLA y soporte regional
              </span>
              <Link
                href="/politica-de-privacidad"
                className="inline-flex items-center gap-2 rounded-full border border-[#04102D]/20 px-3 py-1 font-medium text-[#04102D]/70 transition hover:border-[#04102D]/40 hover:text-[#04102D]"
              >
                Revisá también la Política de Privacidad
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-16 sm:py-20">
          {termsSections.map((section) => (
            <article
              key={section.title}
              className="space-y-4 rounded-3xl border border-[#04102D]/10 bg-white/80 p-8 shadow-sm backdrop-blur"
            >
              <h2 className="text-2xl font-semibold text-[#04102D]">{section.title}</h2>
              {section.paragraphs.map((paragraph) => {
                if (paragraph.includes("{policiesLink}")) {
                  const [beforeLink, afterLink] = paragraph.split("{policiesLink}");
                  return (
                    <p key={paragraph} className="text-base leading-relaxed text-[#04102D]/70">
                      {beforeLink}
                      <Link
                        href="/politica-de-privacidad"
                        className="font-semibold text-[#04102D] underline decoration-[#4BC3FE] decoration-2 underline-offset-4 hover:text-[#4BC3FE]"
                      >
                        Política de Privacidad
                      </Link>
                      {afterLink}
                    </p>
                  );
                }

                return (
                  <p key={paragraph} className="text-base leading-relaxed text-[#04102D]/70">
                    {paragraph}
                  </p>
                );
              })}
            </article>
          ))}
        </section>
      </main>

      <MarketingFooter variant="light" />
    </div>
  );
}
