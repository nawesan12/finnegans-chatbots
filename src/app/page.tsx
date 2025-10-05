"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ContactForm } from "@/components/forms/contact-form";
import { MarketingFooter } from "@/components/marketing/footer";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  Cpu,
  Globe,
  Handshake,
  LayoutDashboard,
  Layers,
  Menu,
  MessageCircle,
  PieChart,
  Quote,
  Server,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Workflow,
  X,
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

const navigationItems = [
  { href: "#plataforma", label: "Plataforma" },
  { href: "#soluciones", label: "Soluciones" },
  { href: "#alianzas", label: "Alianzas" },
  { href: "#equipo", label: "Equipo" },
  { href: "#casos", label: "Casos" },
  { href: "#testimonios", label: "Testimonios" },
  { href: "#implementacion", label: "Implementación" },
  { href: "#recursos", label: "Recursos" },
  { href: "#contacto", label: "Contacto" },
];

const platformPillars = [
  {
    title: "Automatización guiada",
    description:
      "Orquestá bots, agentes y aprobadores en una misma consola con handoffs que conservan el contexto y las decisiones previas.",
    icon: Workflow,
    highlights: [
      "Flujos omnicanal reutilizables",
      "Intervenciones humanas en un clic",
      "Plantillas y generadores validados",
    ],
  },
  {
    title: "Operación centrada en equipos",
    description:
      "Dale a líderes y supervisores visibilidad en tiempo real, asignaciones claras y tableros listos para tus rituales de seguimiento.",
    icon: Users,
    highlights: [
      "Dashboards de performance en vivo",
      "Alertas proactivas en canales internos",
      "Playbooks colaborativos por segmento",
    ],
  },
  {
    title: "Insights accionables",
    description:
      "Combiná datos conversacionales con CRM, ERP y backoffice para detectar oportunidades, riesgos y tendencias.",
    icon: PieChart,
    highlights: [
      "Modelos de clasificación custom",
      "Reportes exportables y API",
      "Monitoreo de calidad asistido por IA",
    ],
  },
  {
    title: "Gobierno y cumplimiento",
    description:
      "Controlá accesos, políticas y retenciones con auditoría continua y soporte especializado para industrias reguladas.",
    icon: ShieldCheck,
    highlights: [
      "Roles y permisos granulados",
      "Trail histórico inviolable",
      "Soporte ejecutivo 24/7",
    ],
  },
];

const reliabilityHighlights = [
  {
    title: "Disponibilidad garantizada",
    description:
      "Infraestructura redundante en múltiples regiones y monitoreo activo para sostener operaciones críticas.",
    icon: Server,
  },
  {
    title: "Procesos certificados",
    description:
      "Playbooks de seguridad alineados a ISO 27001 y prácticas SOX-ready para tus auditorías.",
    icon: Cpu,
  },
];

const governanceTags = [
  "Single Sign-On",
  "Retención configurable",
  "Logs exportables",
  "Acuerdos SLA dedicados",
];

const capabilityItems = [
  "Responde en minutos con workflows auditables.",
  "Integra datos de CRM y backoffice sin fricción.",
  "Monitorea SLAs con tableros en tiempo real.",
  "Acompaña a tus equipos con recomendaciones de IA.",
];

const stats = [
  { label: "SLA cumplido", value: "100%" },
  { label: "Tickets resueltos", value: "1.240" },
  { label: "CSAT global", value: "4.9" },
];

const integrationList = [
  "WhatsApp Business Platform",
  "Finni",
  "Quippos",
  "HubSpot",
  "Finnegans GO",
  "Meta Ads",
];

const trustLogos = ["NovaBank", "Grupo Sideral", "Lumen Retail", "SegurPlus"];

const caseStudies = [
  {
    company: "NovaBank",
    industry: "Banca digital",
    summary:
      "Automatizamos la clasificación y resolución de consultas 24/7 con supervisión humana en escalamiento.",
    metrics: [
      { label: "Reducción de tiempo de respuesta", value: "-55%" },
      { label: "Aumento de autoservicio", value: "+3.5x" },
    ],
  },
  {
    company: "Lumen Retail",
    industry: "Retail omnicanal",
    summary:
      "Unificamos inventario, logística y CRM para brindar seguimiento proactivo en toda la región.",
    metrics: [
      { label: "Órdenes gestionadas por bots", value: "78%" },
      { label: "Satisfacción del cliente", value: "4.8/5" },
    ],
  },
  {
    company: "SegurPlus",
    industry: "Seguros corporativos",
    summary:
      "Digitalizamos la declaración de siniestros con formularios guiados y asignación automática de agentes.",
    metrics: [
      { label: "Casos priorizados correctamente", value: "97%" },
      { label: "Tiempo de registro", value: "8 min → 2 min" },
    ],
  },
];

const allianceBenefits = [
  "Mesa estratégica mensual con tus sponsors.",
  "Acceso anticipado a nuevas integraciones y betas.",
  "Playbooks regulados compartidos entre industrias.",
  "Equipo dedicado para escalamientos críticos.",
];

const alliancePrograms = [
  {
    title: "Partners tecnológicos",
    description:
      "Integramos CRMs, ERPs y soluciones de data warehousing bajo acuerdos de soporte compartidos.",
    icon: Layers,
    stats: [
      { label: "Integraciones validadas", value: "30+" },
      { label: "SLA conjunto", value: "99.9%" },
    ],
  },
  {
    title: "Consultoría Finnegans",
    description:
      "Equipo senior para discovery, diseño de journeys y roadmap de automatización continuo.",
    icon: Sparkles,
    stats: [
      { label: "Workshops trimestrales", value: "12" },
      { label: "Especialistas regionales", value: "15" },
    ],
  },
  {
    title: "Alianzas industriales",
    description:
      "Programas conjuntos con cámaras y asociaciones para compartir playbooks regulados.",
    icon: Handshake,
    stats: [
      { label: "Sectores cubiertos", value: "6" },
      { label: "Clientes referidos", value: "+40%" },
    ],
  },
  {
    title: "Expansión regional",
    description:
      "Operamos implementaciones multi-país con homologación fiscal y soporte bilingüe.",
    icon: Globe,
    stats: [
      { label: "Países activos", value: "8" },
      { label: "Tiempo de despliegue", value: "<4 semanas" },
    ],
  },
];

const enablementMilestones = [
  {
    title: "Kick-off ejecutivo",
    timeframe: "Semana 1",
    description:
      "Definimos objetivos, equipos responsables y acordamos el plan de adopción con métricas compartidas.",
  },
  {
    title: "Integraciones críticas",
    timeframe: "Semanas 2-4",
    description:
      "Conectamos sistemas clave y configuramos tableros de control para asegurar visibilidad desde el día uno.",
  },
  {
    title: "Go-live supervisado",
    timeframe: "Semana 5",
    description:
      "Activamos flujos piloto, entrenamos a operadores y trazamos alertas proactivas para incidencias.",
  },
  {
    title: "Optimización continua",
    timeframe: "Semanas 6-12",
    description:
      "Analizamos datos reales, iteramos journeys y priorizamos nuevos casos con foco en ROI y compliance.",
  },
];

const testimonials = [
  {
    quote:
      "En tres meses consolidamos atención regional y datos de clientes. El equipo de Finnegans fue clave para definir procesos y medir impacto desde el primer día.",
    name: "Sofía Martínez",
    role: "Directora de Customer Care",
    company: "Grupo Sideral",
    metrics: [
      { label: "Escalamiento evitado", value: "-62%" },
      { label: "SLA crítico", value: "95%" },
    ],
  },
  {
    quote:
      "Migramos nuestros flujos de cobranza sin perder trazabilidad. La visibilidad de tableros y auditoría simplificó las reuniones ejecutivas.",
    name: "Federico Ríos",
    role: "Head de Operaciones",
    company: "NovaBank",
    metrics: [
      { label: "Promesas cumplidas", value: "+47%" },
      { label: "Costo operativo", value: "-28%" },
    ],
  },
  {
    quote:
      "Las automatizaciones nos permiten responder a distribuidores en minutos y coordinar aprobaciones internas sin salir del chat.",
    name: "Valeria Quiroga",
    role: "Gerente Comercial",
    company: "Lumen Retail",
    metrics: [
      { label: "Tiempo de respuesta", value: "-70%" },
      { label: "Ventas asistidas", value: "+3.1x" },
    ],
  },
];

const teamHighlights = [
  {
    title: "Consultores senior",
    description:
      "Especialistas en experiencia del cliente que acompañan tus proyectos regionales.",
    stat: "15",
    statLabel: "expertos regionales",
  },
  {
    title: "Implementaciones ágiles",
    description:
      "Metodología propia para lanzar casos de uso en ciclos de menos de 4 semanas.",
    stat: "4.2",
    statLabel: "semanas promedio",
  },
  {
    title: "Soporte dedicado",
    description:
      "Equipo disponible 24/7 para incidentes críticos y monitoreo proactivo.",
    stat: "99%",
    statLabel: "satisfacción NPS",
  },
];

const resourceCards = [
  {
    title: "Guía para conectar WhatsApp Cloud",
    description:
      "Checklist técnico y pasos de gobierno para vincular Finnegans con Meta de forma segura.",
    href: "https://finnegans.com/recursos/whatsapp-cloud",
    linkLabel: "Leer guía",
  },
  {
    title: "Playbook de automatización",
    description:
      "Casos de uso reales para ventas, soporte y cobranzas con métricas de impacto.",
    href: "https://finnegans.com/recursos/playbook-automatizacion",
    linkLabel: "Descargar playbook",
  },
  {
    title: "Webinar on-demand",
    description:
      "Demostración de la plataforma y mejores prácticas para equipos regionales.",
    href: "https://finnegans.com/eventos/webinar-chatbots",
    linkLabel: "Ver webinar",
  },
];

const faqItems = [
  {
    question: "¿Cuánto tarda una implementación típica?",
    answer:
      "Los casos de uso prioritarios se despliegan en ciclos de 3 a 5 semanas, incluyendo entrenamiento y pruebas con tus equipos.",
  },
  {
    question: "¿Qué requerimientos técnicos necesito?",
    answer:
      "Con una cuenta verificada en Meta, acceso a tu CRM y credenciales básicas podemos comenzar. Nuestro equipo se encarga del resto.",
  },
  {
    question: "¿Puedo migrar mis flujos actuales?",
    answer:
      "Sí. Importamos plantillas, conectores y configuraciones existentes y los adaptamos a los estándares de Finnegans Chatbots.",
  },
];

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-white text-[#04102D]">
      <header className="relative border-b border-[#04102D]/10 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3" onClick={closeMobileMenu}>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#04102D] text-base font-semibold text-white">
              F.
            </span>
            <div className="leading-tight">
              <p className="text-xs uppercase tracking-[0.28em] text-[#04102D]/60">
                Finnegans
              </p>
              <p className="text-xl font-semibold text-[#04102D]">Chatbots</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-[#04102D]/70 md:flex">
            {navigationItems.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-[#04102D]">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Button
              asChild
              variant="ghost"
              className="border border-transparent bg-transparent text-[#04102D]/70 hover:border-[#04102D]/10 hover:bg-[#04102D]/5 hover:text-[#04102D]"
            >
              <Link href="/login">Ingresar</Link>
            </Button>
            <Button
              asChild
              className="rounded-full bg-[#4BC3FE] px-5 py-2.5 text-sm font-semibold text-[#04102D] hover:bg-[#3EB6F1]"
            >
              <Link href="/register">Solicitar demo</Link>
            </Button>
          </div>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#04102D]/15 text-[#04102D] transition hover:border-[#04102D]/30 hover:bg-[#04102D]/5 md:hidden"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="absolute inset-x-0 top-full z-50 border-t border-[#04102D]/10 bg-white shadow-xl md:hidden">
            <nav className="flex flex-col gap-1 px-6 py-4 text-sm font-medium text-[#04102D]/80">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-xl px-3 py-2 hover:bg-[#04102D]/5 hover:text-[#04102D]"
                  onClick={closeMobileMenu}
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-3 flex flex-col gap-2">
                <Button
                  asChild
                  variant="ghost"
                  className="justify-start border border-[#04102D]/10 bg-transparent text-[#04102D] hover:bg-[#04102D]/5"
                  onClick={closeMobileMenu}
                >
                  <Link href="/login">Ingresar</Link>
                </Button>
                <Button
                  asChild
                  className="justify-center rounded-full bg-[#4BC3FE] px-5 py-2.5 text-sm font-semibold text-[#04102D] hover:bg-[#3EB6F1]"
                  onClick={closeMobileMenu}
                >
                  <Link href="/register">Solicitar demo</Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="space-y-24 pb-24">
        <section className="relative overflow-hidden bg-[#04102D] text-white">
          <div className="absolute inset-0">
            <div className="absolute -left-16 top-12 hidden h-40 w-40 rounded-3xl border border-white/10 lg:block" />
            <div className="absolute bottom-10 left-6 h-24 w-24 rounded-2xl border border-white/10" />
            <div className="absolute -right-24 top-16 hidden h-64 w-64 rounded-3xl border border-[#4BC3FE]/40 lg:block" />
          </div>
          <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-20 lg:flex-row lg:items-center">
            <div className="space-y-10 lg:w-1/2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
                <Building2 className="h-4 w-4" /> Plataforma corporativa
              </span>
              <div className="space-y-6">
                <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                  Experiencias conversacionales controladas, seguras y listas
                  para crecer.
                </h1>
                <p className="max-w-xl text-lg text-white/75">
                  Centraliza procesos críticos, automatiza la atención y alinea
                  a todos tus equipos con una misma voz. Escala sin perder la
                  calidad del servicio.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  asChild
                  className="h-12 rounded-full bg-[#4BC3FE] px-7 text-base font-semibold text-[#04102D] hover:bg-[#3EB6F1]"
                >
                  <Link href="/register">
                    Agendar una demo
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="h-12 rounded-full border border-white/20 bg-transparent px-7 text-base font-semibold text-white hover:border-white/40 hover:bg-white/10"
                >
                  <Link href="/login">Ver plataforma</Link>
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {capabilityItems.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
                  >
                    <CheckCircle2 className="h-4 w-4 text-[#4BC3FE]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:w-1/2">
              <div className="grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
                <h2 className="text-lg font-semibold text-white">
                  Resultados sostenidos
                </h2>
                <div className="grid gap-4 ">
                  {stats.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center"
                    >
                      <p className="text-3xl font-semibold text-white">
                        {item.value}
                      </p>
                      <p className="text-xs uppercase tracking-[0.28em] text-white/60">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  {featureHighlights.map((item) => (
                    <div key={item.title} className="flex gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#4BC3FE]">
                        <item.icon className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-white">
                          {item.title}
                        </p>
                        <p className="text-sm text-white/70">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="plataforma" className="mx-auto w-full max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#04102D]/60">
                Plataforma Finnegans
              </p>
              <h2 className="text-3xl font-semibold leading-tight text-[#04102D]">
                Todos los módulos que necesitás para operar conversaciones críticas.
              </h2>
              <p className="text-lg text-[#04102D]/70">
                Nuestra arquitectura combina automatización, visibilidad y gobierno para que tu organización escale sin perder control ni compliance.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {reliabilityHighlights.map((item) => (
                  <div
                    key={item.title}
                    className="flex flex-col gap-3 rounded-3xl border border-[#04102D]/10 bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-center gap-3 text-[#04102D]">
                      <item.icon className="h-5 w-5 text-[#4BC3FE]" />
                      <p className="text-sm font-semibold">{item.title}</p>
                    </div>
                    <p className="text-sm text-[#04102D]/70">{item.description}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {governanceTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[#04102D]/10 bg-[#04102D]/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-[#04102D]/60"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {platformPillars.map((pillar) => (
                <div
                  key={pillar.title}
                  className="flex h-full flex-col gap-4 rounded-3xl border border-[#04102D]/10 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#4BC3FE]/20 text-[#04102D]">
                      <pillar.icon className="h-5 w-5" />
                    </span>
                    <p className="text-lg font-semibold text-[#04102D]">{pillar.title}</p>
                  </div>
                  <p className="text-sm text-[#04102D]/70">{pillar.description}</p>
                  <ul className="space-y-2 text-sm text-[#04102D]/70">
                    {pillar.highlights.map((highlight) => (
                      <li key={highlight} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-[#4BC3FE]" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="soluciones" className="mx-auto w-full max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#04102D]/60">
                Operaciones conectadas
              </p>
              <h2 className="text-3xl font-semibold leading-tight">
                Conecta canales, personas y procesos con un mismo estándar de
                servicio.
              </h2>
              <p className="text-lg text-[#04102D]/70">
                Unifica la experiencia del cliente en WhatsApp, redes sociales y
                sitios web. Diseña flujos con supervisión humana y mantén
                trazabilidad completa en cada interacción.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {featureHighlights.map((item) => (
                  <div
                    key={item.title}
                    className="flex flex-col gap-3 rounded-3xl border border-[#04102D]/10 bg-white p-6 shadow-sm"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4BC3FE]/20 text-[#04102D]">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-[#04102D]">
                        {item.title}
                      </p>
                      <p className="text-sm text-[#04102D]/70">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col justify-between gap-8 rounded-3xl border border-[#04102D]/10 bg-white p-8 shadow-sm">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">
                  Integraciones preferidas
                </h3>
                <p className="text-sm text-[#04102D]/70">
                  Conecta Finnegans Chatbots con las herramientas que ya utiliza
                  tu organización para garantizar continuidad operativa.
                </p>
              </div>
              <div className="grid gap-3 text-sm font-medium text-[#04102D]">
                {integrationList.map((integration) => (
                  <div
                    key={integration}
                    className="flex items-center justify-between rounded-xl border border-[#04102D]/10 px-4 py-3"
                  >
                    <span>{integration}</span>
                    <ArrowRight className="h-4 w-4 text-[#4BC3FE]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="alianzas" className="bg-[#04102D]/5 py-16">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-8">
              <div className="space-y-6">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#04102D]/60">
                  Ecosistema Finnegans
                </p>
                <h2 className="text-3xl font-semibold leading-tight text-[#04102D]">
                  Acelerá resultados con aliados certificados y un plan de adopción guiado.
                </h2>
                <p className="text-lg text-[#04102D]/70">
                  Colaboramos con partners tecnológicos, consultores y cámaras industriales para mantener tus flujos alineados
                  a los estándares de tu negocio.
                </p>
              </div>
              <ul className="grid gap-3 text-sm text-[#04102D]/70 sm:grid-cols-2">
                {allianceBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#4BC3FE]" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <div className="space-y-5 rounded-3xl border border-[#04102D]/10 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#04102D]/60">
                      Hoja de ruta 90 días
                    </p>
                    <p className="text-lg font-semibold text-[#04102D]">
                      Acompañamiento ejecutivo continuo
                    </p>
                  </div>
                  <CalendarClock className="h-7 w-7 text-[#4BC3FE]" aria-hidden="true" />
                </div>
                <div className="space-y-4">
                  {enablementMilestones.map((milestone) => (
                    <div
                      key={milestone.title}
                      className="rounded-2xl border border-[#04102D]/10 bg-[#04102D]/5 p-4"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#04102D]/60">
                        {milestone.timeframe}
                      </p>
                      <p className="text-base font-semibold text-[#04102D]">{milestone.title}</p>
                      <p className="text-sm text-[#04102D]/70">{milestone.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {alliancePrograms.map((program) => (
                <div
                  key={program.title}
                  className="flex h-full flex-col gap-5 rounded-3xl border border-[#04102D]/10 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#4BC3FE]/20 text-[#04102D]">
                        <program.icon className="h-5 w-5" />
                      </span>
                      <p className="text-lg font-semibold text-[#04102D]">{program.title}</p>
                    </div>
                    <Target className="h-5 w-5 text-[#4BC3FE]" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-[#04102D]/70">{program.description}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {program.stats.map((stat) => (
                      <div
                        key={`${program.title}-${stat.label}`}
                        className="rounded-2xl border border-[#04102D]/10 bg-[#04102D]/5 p-4"
                      >
                        <p className="text-2xl font-semibold text-[#04102D]">{stat.value}</p>
                        <p className="text-xs uppercase tracking-[0.28em] text-[#04102D]/60">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="equipo" className="bg-[#04102D]/5 py-16">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 lg:flex-row lg:items-start">
            <div className="max-w-xl space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#04102D]/60">
                Equipo experto
              </p>
              <h2 className="text-3xl font-semibold leading-tight text-[#04102D]">
                Acompañamiento estratégico para cada etapa de tu operación.
              </h2>
              <p className="text-lg text-[#04102D]/70">
                Desde la consultoría inicial hasta el soporte continuo, contamos
                con especialistas que entienden la complejidad de los servicios
                corporativos.
              </p>
              <div className="flex items-center gap-6">
                <div className="flex -space-x-3">
                  {[0, 1, 2].map((item) => (
                    <div
                      key={item}
                      className="h-12 w-12 rounded-full border-2 border-white bg-[#4BC3FE]/40"
                    />
                  ))}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#04102D]">
                    +120 organizaciones regionales
                  </p>
                  <p className="text-xs uppercase tracking-[0.28em] text-[#04102D]/60">
                    confían en nuestro equipo
                  </p>
                </div>
              </div>
            </div>
            <div className="grid flex-1 gap-6 ">
              {teamHighlights.map((item) => (
                <div
                  key={item.title}
                  className="flex flex-col gap-4 rounded-3xl border border-[#04102D]/10 bg-white p-6 shadow-sm"
                >
                  <p className="text-4xl font-semibold text-[#04102D]">
                    {item.stat}
                  </p>
                  <p className="text-xs uppercase tracking-[0.28em] text-[#04102D]/60">
                    {item.statLabel}
                  </p>
                  <p className="text-sm text-[#04102D]/70">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="casos" className="bg-[#04102D] py-16 text-white">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 lg:flex-row lg:items-start">
            <div className="max-w-xl space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
                Casos de éxito
              </p>
              <h2 className="text-3xl font-semibold leading-tight">
                Resultados tangibles en industrias reguladas y operaciones de alto volumen.
              </h2>
              <p className="text-lg text-white/75">
                Diseñamos journeys conversacionales que conectan con tus sistemas existentes, respetan el compliance y generan indicadores accionables desde el día uno.
              </p>
              <div className="space-y-4 rounded-3xl border border-white/15 bg-white/5 p-6">
                <p className="text-sm font-semibold text-white">Cómo acompañamos a tu equipo</p>
                <ul className="space-y-3 text-sm text-white/75">
                  <li>▶ Workshops ejecutivos para alinear objetivos y KPIs clave.</li>
                  <li>▶ Equipo técnico dedicado a integraciones y migración de datos.</li>
                  <li>▶ Mesa de seguimiento quincenal con insights y recomendaciones.</li>
                </ul>
                <Button
                  asChild
                  className="mt-2 h-11 w-full rounded-full bg-white text-sm font-semibold text-[#04102D] transition hover:bg-white/90"
                >
                  <Link href="/register">Solicitar un caso a medida</Link>
                </Button>
              </div>
            </div>
            <div className="grid flex-1 gap-6">
              {caseStudies.map((caseStudy) => (
                <div
                  key={caseStudy.company}
                  className="flex flex-col gap-4 rounded-3xl border border-white/15 bg-white/5 p-6"
                >
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
                      {caseStudy.industry}
                    </p>
                    <p className="text-2xl font-semibold text-white">{caseStudy.company}</p>
                    <p className="text-sm text-white/75">{caseStudy.summary}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {caseStudy.metrics.map((metric) => (
                      <div
                        key={`${caseStudy.company}-${metric.label}`}
                        className="rounded-2xl border border-white/10 bg-white/10 p-4"
                      >
                        <p className="text-2xl font-semibold text-white">{metric.value}</p>
                        <p className="text-xs uppercase tracking-[0.28em] text-white/70">
                          {metric.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="testimonios" className="relative overflow-hidden bg-[#04102D] py-16 text-white">
          <div className="absolute inset-0 opacity-60" aria-hidden="true">
            <div className="absolute -left-24 top-16 h-56 w-56 rounded-full border border-white/15" />
            <div className="absolute bottom-10 right-0 h-40 w-40 rounded-3xl border border-[#4BC3FE]/30" />
          </div>
          <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-6">
            <div className="max-w-2xl space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
                Testimonios
              </p>
              <h2 className="text-3xl font-semibold leading-tight">
                Historias de equipos que ya operan conversaciones críticas con Finnegans.
              </h2>
              <p className="text-lg text-white/75">
                Cada alianza combina procesos, tecnología y acompañamiento. Estas organizaciones ya capturan valor medible en
                semanas.
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.name}
                  className="flex h-full flex-col gap-5 rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur"
                >
                  <Quote className="h-6 w-6 text-[#4BC3FE]" aria-hidden="true" />
                  <p className="flex-1 text-lg italic text-white/80">“{testimonial.quote}”</p>
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-white">{testimonial.name}</p>
                    <p className="text-sm text-white/70">
                      {testimonial.role} · {testimonial.company}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {testimonial.metrics.map((metric) => (
                      <div
                        key={`${testimonial.name}-${metric.label}`}
                        className="rounded-2xl border border-white/10 bg-white/10 p-4"
                      >
                        <p className="text-2xl font-semibold text-white">{metric.value}</p>
                        <p className="text-xs uppercase tracking-[0.28em] text-white/70">{metric.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between">
              <p>
                ¿Querés conocer implementaciones en tu industria? Prepararemos un caso detallado con indicadores y próximos
                pasos.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  asChild
                  className="h-11 rounded-full bg-white px-6 text-sm font-semibold text-[#04102D] hover:bg-white/90"
                >
                  <Link href="/register">Solicitar estudio personalizado</Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="h-11 rounded-full border border-white/20 bg-transparent px-6 text-sm font-semibold text-white hover:border-white/40 hover:bg-white/10"
                >
                  <a href="#casos">Ver más métricas</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section id="implementacion" className="mx-auto w-full max-w-6xl px-6">
          <div className="rounded-3xl border border-[#04102D]/10 bg-white p-10 shadow-sm">
            <div className="flex flex-col gap-12 lg:flex-row lg:items-start">
              <div className="max-w-sm space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#04102D]/60">
                  Metodología Finnegans
                </p>
                <h2 className="text-3xl font-semibold leading-tight">
                  Implementación sin fricciones para tus equipos.
                </h2>
                <p className="text-lg text-[#04102D]/70">
                  Diseñamos un proceso claro que garantiza adopción,
                  cumplimiento y resultados visibles desde el primer mes.
                </p>
              </div>
              <div className="grid flex-1 gap-6">
                {["Descubrimiento", "Despliegue", "Optimización"].map(
                  (phase, index) => (
                    <div
                      key={phase}
                      className="flex flex-col gap-4 rounded-2xl border border-[#04102D]/10 bg-[#04102D]/5 p-6"
                    >
                      <span className="text-sm font-semibold text-[#4BC3FE]">
                        Paso {index + 1}
                      </span>
                      <p className="text-lg font-semibold text-[#04102D]">
                        {phase}
                      </p>
                      <p className="text-sm text-[#04102D]/70">
                        {index === 0 &&
                          "Relevamos objetivos, volumen de interacción y sistemas para integrar la solución adecuada."}
                        {index === 1 &&
                          "Configuramos automatizaciones, conectores y tableros con sesiones de acompañamiento ejecutivo."}
                        {index === 2 &&
                          "Medimos impacto, generamos recomendaciones y evolucionamos tus casos de uso de forma continua."}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="recursos" className="bg-[#04102D]/5 py-16">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 lg:flex-row lg:items-start">
            <div className="max-w-xl space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#04102D]/60">
                Recursos
              </p>
              <h2 className="text-3xl font-semibold leading-tight text-[#04102D]">
                Capacita a tus equipos y acelera la adopción de Finnegans.
              </h2>
              <p className="text-lg text-[#04102D]/70">
                Documentación, plantillas y sesiones bajo demanda diseñadas para que tu operación converse con clientes en días, no en meses.
              </p>
            </div>
            <div className="grid flex-1 gap-6 sm:grid-cols-2">
              {resourceCards.map((card) => (
                <div
                  key={card.title}
                  className="flex h-full flex-col justify-between gap-4 rounded-3xl border border-[#04102D]/10 bg-white p-6 shadow-sm"
                >
                  <div className="space-y-3">
                    <p className="text-lg font-semibold text-[#04102D]">{card.title}</p>
                    <p className="text-sm text-[#04102D]/70">{card.description}</p>
                  </div>
                  <Button
                    asChild
                    variant="ghost"
                    className="justify-start border border-transparent px-0 text-sm font-semibold text-[#4BC3FE] hover:bg-[#4BC3FE]/10"
                  >
                    <a href={card.href} target="_blank" rel="noreferrer">
                      {card.linkLabel}
                      <ArrowRight className="ml-2 inline h-4 w-4" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6">
          <div className="grid gap-10 rounded-3xl border border-[#04102D]/10 bg-white p-10 shadow-sm lg:grid-cols-[1.2fr,0.8fr]">
            <div className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#04102D]/60">
                Preguntas frecuentes
              </p>
              <h2 className="text-3xl font-semibold leading-tight text-[#04102D]">
                Todo lo necesario para iniciar con confianza.
              </h2>
              <div className="space-y-4">
                {faqItems.map((item) => (
                  <div key={item.question} className="space-y-2 rounded-2xl border border-[#04102D]/10 bg-[#04102D]/5 p-5">
                    <p className="text-base font-semibold text-[#04102D]">{item.question}</p>
                    <p className="text-sm text-[#04102D]/70">{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-6 rounded-3xl border border-[#04102D]/10 bg-[#04102D] p-8 text-white">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Confianza corporativa</p>
                <h3 className="text-2xl font-semibold leading-snug">
                  Organizaciones líderes gestionan su voz digital con Finnegans.
                </h3>
                <p className="text-sm text-white/75">
                  Sumate a la red de empresas que priorizan la seguridad, el compliance y la calidad en cada interacción con clientes.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
                {trustLogos.map((logo) => (
                  <span key={logo} className="rounded-full border border-white/20 px-4 py-2 text-white/80">
                    {logo}
                  </span>
                ))}
              </div>
              <div className="space-y-4 rounded-2xl bg-white/5 p-6">
                <p className="text-sm font-semibold text-white">Contactá a nuestro equipo</p>
                <div className="space-y-2 text-sm text-white/70">
                  <p>📞 +54 11 5263-7700</p>
                  <p>✉️ <a href="mailto:hello@finnegans.com" className="underline decoration-white/40 underline-offset-4">hello@finnegans.com</a></p>
                  <p>🕒 Lunes a viernes, 9 a 18 h (ART)</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    asChild
                    className="h-11 flex-1 rounded-full bg-[#4BC3FE] px-6 text-sm font-semibold text-[#04102D] hover:bg-[#3EB6F1]"
                  >
                    <Link href="/register">Agendar reunión</Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    className="h-11 flex-1 rounded-full border border-white/30 bg-transparent px-6 text-sm font-semibold text-white hover:border-white/60 hover:bg-white/10"
                  >
                    <Link href="/login">Explorar dashboard</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="contacto" className="mx-auto w-full max-w-6xl px-6">
          <div className="mt-12 rounded-3xl border border-[#04102D]/10 bg-white p-10 shadow-sm">
            <div className="grid gap-10 lg:grid-cols-[1.05fr,0.95fr] lg:items-start">
              <div className="space-y-8">
                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#04102D]/60">
                    Próximos pasos
                  </p>
                  <h2 className="text-3xl font-semibold leading-tight text-[#04102D]">
                    Coordinemos una sesión personalizada para tu operación.
                  </h2>
                  <p className="text-lg text-[#04102D]/70">
                    Nuestro equipo prepara un roadmap a medida con integraciones, responsables y métricas de éxito claras.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-3 rounded-2xl border border-[#04102D]/10 bg-[#04102D]/5 p-6">
                    <p className="text-sm font-semibold text-[#04102D]">1. Agenda</p>
                    <p className="text-sm text-[#04102D]/70">
                      Elegí día y horario para un workshop exploratorio junto a tus líderes.
                    </p>
                  </div>
                  <div className="space-y-3 rounded-2xl border border-[#04102D]/10 bg-[#04102D]/5 p-6">
                    <p className="text-sm font-semibold text-[#04102D]">2. Diseño</p>
                    <p className="text-sm text-[#04102D]/70">
                      Definimos procesos, fuentes de datos y responsabilidades de despliegue.
                    </p>
                  </div>
                  <div className="space-y-3 rounded-2xl border border-[#04102D]/10 bg-[#04102D]/5 p-6">
                    <p className="text-sm font-semibold text-[#04102D]">3. Lanzamiento</p>
                    <p className="text-sm text-[#04102D]/70">
                      Activamos flujos piloto y medimos resultados para iterar rápidamente.
                    </p>
                  </div>
                  <div className="space-y-3 rounded-2xl border border-[#04102D]/10 bg-[#04102D]/5 p-6">
                    <p className="text-sm font-semibold text-[#04102D]">4. Escala</p>
                    <p className="text-sm text-[#04102D]/70">
                      Extendemos la solución a nuevas unidades de negocio con gobierno continuo.
                    </p>
                  </div>
                </div>
              </div>
              <ContactForm />
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
