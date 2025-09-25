import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  LayoutDashboard,
  MessageCircle,
  ShieldCheck,
  Users2,
} from "lucide-react";

const featureHighlights = [
  {
    title: "Diseño centralizado",
    description:
      "Orquesta bots, agentes y canales desde un hub que mantiene el tono de tu marca en cada respuesta.",
    icon: LayoutDashboard,
  },
  {
    title: "Seguridad empresarial",
    description:
      "Gobierna el acceso con roles detallados, auditorías continuas y cumplimiento para industrias reguladas.",
    icon: ShieldCheck,
  },
  {
    title: "IA que escala equipos",
    description:
      "Resuelve automáticamente los casos repetitivos y entrega insights accionables a tus supervisores.",
    icon: MessageCircle,
  },
];

const capabilityItems = [
  "Responde en minutos con workflows auditables.",
  "Integra datos de CRM y backoffice sin fricción.",
  "Monitorea SLAs con tableros en tiempo real.",
  "Acompaña a tus equipos con recomendaciones de IA.",
];

const stats = [
  { label: "SLA cumplido", value: "98%" },
  { label: "Tickets resueltos", value: "1.240" },
  { label: "CSAT global", value: "4.9" },
];

const integrationList = [
  "WhatsApp Business Platform",
  "Zendesk",
  "Salesforce",
  "HubSpot",
  "Microsoft Teams",
  "Meta Ads",
];

const trustLogos = ["NovaBank", "Grupo Sideral", "Lumen Retail", "SegurPlus"];

const teamHighlights = [
  {
    title: "Consultores senior",
    description: "Especialistas en experiencia del cliente que acompañan tus proyectos regionales.",
    stat: "15",
    statLabel: "expertos regionales",
  },
  {
    title: "Implementaciones ágiles",
    description: "Metodología propia para lanzar casos de uso en ciclos de menos de 4 semanas.",
    stat: "4.2",
    statLabel: "semanas promedio",
  },
  {
    title: "Soporte dedicado",
    description: "Equipo disponible 24/7 para incidentes críticos y monitoreo proactivo.",
    stat: "99%",
    statLabel: "satisfacción NPS",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F5F7FB] text-[#101828]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#101828] text-base font-semibold text-white">
              F.
            </span>
            <div className="leading-tight">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Finnegans</p>
              <p className="text-xl font-semibold text-[#101828]">Chatbots</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <Link href="#soluciones" className="hover:text-[#101828]">
              Soluciones
            </Link>
            <Link href="#equipo" className="hover:text-[#101828]">
              Equipo
            </Link>
            <Link href="#implementacion" className="hover:text-[#101828]">
              Implementación
            </Link>
            <Link href="#contacto" className="hover:text-[#101828]">
              Recursos
            </Link>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Button
              asChild
              variant="ghost"
              className="border border-transparent bg-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-100"
            >
              <Link href="/login">Ingresar</Link>
            </Button>
            <Button
              asChild
              className="rounded-full bg-[#101828] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#172644]"
            >
              <Link href="/register">Solicitar demo</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="space-y-20 pb-24">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pt-16 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              <Building2 className="h-4 w-4 text-[#101828]" /> Plataformas corporativas
            </div>
            <div className="space-y-6">
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-[3.5rem]">
                Plataforma conversacional para equipos que cuidan cada interacción.
              </h1>
              <p className="max-w-xl text-lg text-slate-600">
                Centraliza conversaciones, automatiza procesos críticos y entrega experiencias alineadas a tu marca en todos los
                canales. Tu equipo opera con precisión y tus clientes reciben respuestas consistentes.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {capabilityItems.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {item}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button
                asChild
                className="flex items-center gap-2 rounded-full bg-[#101828] px-7 py-4 text-base font-semibold text-white hover:bg-[#172644]"
              >
                <Link href="/register">
                  Agendar una demo
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Link
                href="/login"
                className="text-sm font-semibold text-[#101828] underline underline-offset-4 hover:text-[#172644]"
              >
                Explorar el producto
              </Link>
            </div>
            <div className="flex flex-col gap-2 text-xs uppercase tracking-[0.28em] text-slate-400 sm:flex-row sm:items-center sm:gap-6">
              <span>Confiado por equipos de</span>
              <div className="flex flex-wrap items-center gap-4 text-sm font-medium normal-case tracking-normal text-[#101828]/70">
                {trustLogos.map((brand) => (
                  <span key={brand}>{brand}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-900/5">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Panel ejecutivo</p>
              <h2 className="text-2xl font-semibold text-[#101828]">Salud de la operación</h2>
              <p className="text-sm text-slate-600">
                Indicadores actualizados cada 15 minutos para coordinar tus equipos de atención y ventas.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-slate-200 bg-[#F5F7FB] p-4 text-center">
                  <p className="text-2xl font-semibold text-[#101828]">{stat.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-[#F5F7FB] p-6 text-sm text-slate-600">
              <p className="text-sm font-semibold text-[#101828]">Conversación en seguimiento</p>
              <p className="mt-3">
                “Hola Sofía, confirmamos tu reserva para mañana a las 10:00. ¿Deseas activar recordatorios automáticos?”
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> SLA cumplido 98% esta semana.
              </div>
            </div>
          </div>
        </section>

        <section id="soluciones" className="border-y border-slate-200 bg-white py-20">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6">
            <div className="max-w-2xl space-y-4">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Soluciones clave</p>
              <h2 className="text-3xl font-semibold text-[#101828]">Lo que hace diferente a Finnegans</h2>
              <p className="text-base text-slate-600">
                Diseñamos la plataforma junto a compañías que gestionan miles de conversaciones por día. Cada módulo está pensado
                para operar con estándares corporativos sin sacrificar agilidad.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {featureHighlights.map(({ title, description, icon: Icon }) => (
                <div
                  key={title}
                  className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-[#F8FAFF] p-8"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#101828] text-white">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="text-xl font-semibold text-[#101828]">{title}</h3>
                  <p className="text-sm text-slate-600">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="equipo" className="border-b border-slate-200 bg-[#F5F7FB] py-16">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 lg:grid-cols-[0.9fr,1.1fr]">
            <div className="space-y-5">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Equipo a tu lado</p>
              <h2 className="text-3xl font-semibold text-[#101828]">Expertos que entienden tu operación.</h2>
              <p className="text-base text-slate-600">
                Contarás con consultores certificados que conocen los desafíos de servicio en banca, retail y servicios.
                Diseñamos contigo la hoja de ruta y permanecemos a cargo del monitoreo continuo.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {teamHighlights.map(({ title, description, stat, statLabel }) => (
                <div key={title} className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6">
                  <p className="text-2xl font-semibold text-[#101828]">{stat}</p>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{statLabel}</p>
                  <p className="text-sm font-semibold text-[#101828]">{title}</p>
                  <p className="text-sm text-slate-600">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="implementacion"
          className="mx-auto grid w-full max-w-6xl gap-12 px-6 lg:grid-cols-[1.05fr,0.95fr]"
        >
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Implementación guiada</p>
            <h2 className="text-3xl font-semibold text-[#101828]">
              Acompañamiento estratégico desde la primera automatización.
            </h2>
            <p className="text-base text-slate-600">
              Un equipo multidisciplinario te ayuda a priorizar casos de uso, configurar integraciones y medir el impacto con
              analítica ejecutiva.
            </p>
            <ul className="space-y-4 text-sm text-slate-600">
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#101828]" /> Talleres de descubrimiento con tus stakeholders.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#101828]" /> Lanzamientos iterativos con métricas compartidas.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#101828]" /> Capacitación continua para agentes y supervisores.
              </li>
            </ul>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
              <p className="text-sm font-semibold text-[#101828]">Casos de éxito</p>
              <p className="mt-3 text-sm text-slate-600">
                “Reducimos en 42% el tiempo de resolución al integrar Finnegans con Salesforce y nuestra mesa de ayuda.”
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-[#101828]">
                <Users2 className="h-4 w-4" /> Lumen Retail LATAM
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-900/5">
            <div className="space-y-4">
              <p className="text-sm font-semibold text-[#101828]">Integraciones disponibles</p>
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-500">
                {integrationList.map((integration) => (
                  <div
                    key={integration}
                    className="rounded-2xl border border-dashed border-slate-300 bg-[#F5F7FB] px-4 py-3 text-center"
                  >
                    {integration}
                  </div>
                ))}
              </div>
            </div>
            <Button
              asChild
              className="rounded-full bg-[#101828] px-6 py-3 text-sm font-semibold text-white hover:bg-[#172644]"
            >
              <Link href="/register">Solicitar acompañamiento</Link>
            </Button>
          </div>
        </section>

        <section id="contacto" className="bg-[#101828] py-16 text-white">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.28em] text-white/70">Próximo paso</p>
              <h2 className="text-3xl font-semibold">Conversemos sobre tu estrategia conversacional.</h2>
              <p className="text-sm text-white/70">
                Agenda una sesión con nuestros especialistas y descubre cómo Finnegans puede integrarse a tu ecosistema digital.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                asChild
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#101828] hover:bg-slate-200"
              >
                <Link href="/register">Hablar con ventas</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                <Link href="/login">Ingresar a mi cuenta</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-6 text-sm text-slate-500 sm:flex-row">
          <p className="text-center sm:text-left">
            © {new Date().getFullYear()} Finnegans. Impulsamos experiencias conversacionales confiables para empresas latinoamericanas.
          </p>
          <div className="flex items-center gap-6">
            <span>Privacidad</span>
            <span>Términos</span>
            <span>Soporte</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
