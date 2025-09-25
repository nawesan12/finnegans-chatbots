import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const features = [
  {
    title: "Automatiza tus conversaciones",
    description:
      "Diseña flujos inteligentes en minutos y responde a tus clientes 24/7 sin esfuerzo.",
    icon: Bot,
  },
  {
    title: "Protección y confianza",
    description:
      "Tus datos y los de tus clientes se mantienen seguros con protocolos de nivel empresarial.",
    icon: ShieldCheck,
  },
  {
    title: "Experiencias memorables",
    description:
      "Personaliza cada interacción con IA para ofrecer soporte cálido y cercano en todo momento.",
    icon: MessageSquareText,
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#F2F5FA] text-[#0B1D3B]">
      <header className="mx-auto mt-10 flex w-full max-w-6xl items-center justify-between rounded-full border border-slate-200 bg-white px-6 py-4 shadow-lg shadow-slate-900/5">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B1D3B] text-white">
            <Sparkles className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Finnegans
            </p>
            <p className="text-xl font-semibold">Chatbots</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <span>Soluciones</span>
          <span>Precios</span>
          <span>Historias de éxito</span>
          <span>Recursos</span>
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
            className="rounded-full bg-[#0B1D3B] px-6 py-2 text-white shadow-md shadow-slate-900/10 hover:bg-[#10234A]"
          >
            <Link href="/register">Comenzar gratis</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-6 pb-24 pt-16">
        <section className="grid gap-16 rounded-[2.5rem] border border-slate-200 bg-white/90 p-10 shadow-xl shadow-slate-900/5 md:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              <Sparkles className="h-4 w-4 text-[#0B1D3B]" /> Innovación latina
            </div>
            <div className="space-y-6">
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                Conversaciones inteligentes para empresas que buscan escala.
              </h1>
              <p className="max-w-xl text-lg text-slate-600">
                Centraliza canales, automatiza respuestas y mantén una voz de marca impecable en cada interacción. Nuestra plataforma te ayuda a ganar eficiencia sin perder el toque humano.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                asChild
                className="flex items-center gap-2 rounded-full bg-[#0B1D3B] px-8 py-5 text-base font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-[#10234A]"
              >
                <Link href="/register">
                  Empieza ahora
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full border-slate-200 bg-white px-8 py-5 text-base font-semibold text-[#0B1D3B] hover:bg-slate-100"
              >
                <Link href="/login">Ver demo en vivo</Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  number: "+3M",
                  label: "Mensajes gestionados al mes",
                },
                { number: "100%", label: "Clientes con renovaciones" },
                { number: "24/7", label: "Operación asistida por IA" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center"
                >
                  <p className="text-3xl font-bold text-[#0B1D3B]">{stat.number}</p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Panel ejecutivo
                </p>
                <p className="mt-2 text-2xl font-semibold text-[#0B1D3B]">
                  Asistente virtual
                </p>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0B1D3B]/10 text-[#0B1D3B]">
                <Bot className="h-6 w-6" />
              </span>
            </div>
            <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Conversación destacada
              </p>
              <p className="text-base font-medium text-[#0B1D3B]">
                &ldquo;Hola Sofía, confirmamos tu reserva para mañana a las 10:00. ¿Deseas agregar recordatorios automáticos?&rdquo;
              </p>
            </div>
            <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-sm font-semibold text-[#0B1D3B]">
                Rendimiento semanal
              </p>
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Chats resueltos</span>
                <span className="font-semibold text-[#0B1D3B]">1,248</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Automatizaciones activas</span>
                <span className="font-semibold text-[#0B1D3B]">36</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Satisfacción</span>
                <span className="font-semibold text-[#0B1D3B]">4.9/5</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {features.map(({ title, description, icon: Icon }) => (
            <div
              key={title}
              className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-900/5"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#0B1D3B]/10 text-[#0B1D3B]">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="text-xl font-semibold text-[#0B1D3B]">{title}</h3>
              <p className="text-sm text-slate-600">{description}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-10 rounded-[2.5rem] border border-slate-200 bg-white p-10 shadow-xl shadow-slate-900/5 lg:grid-cols-2">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Cómo trabajamos</p>
            <h2 className="text-3xl font-semibold text-[#0B1D3B]">
              Acompañamiento estratégico para implementar tu centro conversacional.
            </h2>
            <ul className="space-y-4 text-sm text-slate-600">
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#0B1D3B]" />
                Descubrimos tus procesos clave y diseñamos un mapa de automatización omnicanal.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#0B1D3B]" />
                Configuramos bots, integraciones y métricas con un equipo especializado.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#0B1D3B]" />
                Medimos impacto en tiempo real para optimizar la experiencia de tus clientes.
              </li>
            </ul>
          </div>
          <div className="flex flex-col justify-between gap-6 rounded-3xl border border-slate-200 bg-slate-50 p-8">
            <div className="space-y-4">
              <p className="text-sm font-semibold text-[#0B1D3B]">
                Integraciones disponibles
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-500">
                {[
                  "WhatsApp Business Platform",
                  "Zendesk",
                  "Salesforce",
                  "HubSpot",
                  "Microsoft Teams",
                  "Meta Ads",
                ].map((integration) => (
                  <div
                    key={integration}
                    className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-center"
                  >
                    {integration}
                  </div>
                ))}
              </div>
            </div>
            <Button
              asChild
              className="rounded-full bg-[#0B1D3B] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 hover:bg-[#10234A]"
            >
              <Link href="/register">Solicitar asesoría</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/90 py-10">
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
