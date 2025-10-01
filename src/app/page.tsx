"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  LayoutDashboard,
  Menu,
  MessageCircle,
  ShieldCheck,
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
  { href: "#soluciones", label: "Soluciones" },
  { href: "#equipo", label: "Equipo" },
  { href: "#implementacion", label: "Implementación" },
  { href: "#contacto", label: "Recursos" },
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

        <section id="contacto" className="mx-auto w-full max-w-6xl px-6">
          <div className="flex flex-col items-center gap-10 rounded-3xl bg-[#04102D] px-10 py-16 text-center text-white">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
                Confianza corporativa
              </p>
              <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">
                Organizaciones líderes gestionan su voz digital con Finnegans.
              </h2>
              <p className="text-lg text-white/75">
                Sumate a la red de empresas que priorizan la seguridad, el
                compliance y la calidad en cada interacción con clientes.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-white/80">
              {trustLogos.map((logo) => (
                <span
                  key={logo}
                  className="rounded-full border border-white/20 px-5 py-2"
                >
                  {logo}
                </span>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="h-12 rounded-full bg-[#4BC3FE] px-8 text-base font-semibold text-[#04102D] hover:bg-[#3EB6F1]"
              >
                <Link href="/register">Agendar reunión</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="h-12 rounded-full border border-white/20 bg-transparent px-8 text-base font-semibold text-white hover:border-white/40 hover:bg-white/10"
              >
                <Link href="/login">Explorar dashboard</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
