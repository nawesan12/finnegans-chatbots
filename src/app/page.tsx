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
    <div className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <header className="mx-auto mt-8 flex w-full max-w-6xl items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0f172a]/5 text-[#0f172a]">
            <Sparkles className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
              Finnegans
            </p>
            <p className="text-xl font-semibold text-[#0f172a]">Chatbots</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <span>Soluciones</span>
          <span>Precios</span>
          <span>Historias de éxito</span>
          <span>Recursos</span>
        </nav>
        <div className="hidden items-center gap-4 md:flex">
          <Button
            asChild
            variant="ghost"
            className="border-0 bg-transparent text-slate-600 hover:bg-slate-100"
          >
            <Link href="/login">Ingresar</Link>
          </Button>
          <Button
            asChild
            className="bg-[#0f172a] text-white shadow-sm transition hover:bg-[#132547]"
          >
            <Link href="/register">Comenzar gratis</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto mt-16 flex w-full max-w-6xl flex-col gap-20 px-6 pb-24">
        <section className="grid gap-16 rounded-[28px] border border-slate-200 bg-white p-10 shadow-lg shadow-slate-200/40 md:grid-cols-[1.05fr,0.95fr] md:items-center">
          <div className="space-y-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#0f172a] px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white">
              <Sparkles className="h-4 w-4" /> Innovación latina
            </span>
            <div className="space-y-6">
              <h1 className="text-4xl font-semibold leading-tight text-[#0f172a] sm:text-5xl lg:text-6xl">
                Chatbots corporativos que elevan cada conversación.
              </h1>
              <p className="max-w-xl text-lg text-slate-600">
                Diseña experiencias conversacionales consistentes con la identidad de tu marca, automatiza tareas críticas y brinda respuestas fiables en cualquier canal.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                asChild
                className="flex items-center gap-2 rounded-full bg-[#0f172a] px-8 py-6 text-base font-semibold text-white transition hover:bg-[#132547]"
              >
                <Link href="/register">
                  Empieza ahora
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full border-slate-200 bg-transparent px-8 py-6 text-base font-semibold text-[#0f172a] transition hover:bg-slate-100"
              >
                <Link href="/login">Ver demo en vivo</Link>
              </Button>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                {
                  number: "+3M",
                  label: "mensajes gestionados al mes",
                },
                { number: "100%", label: "clientes felices" },
                { number: "24/7", label: "soporte inteligente" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center"
                >
                  <p className="text-3xl font-bold text-[#0f172a]">{stat.number}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                    Panel activo
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-[#0f172a]">
                    Asistente virtual
                  </p>
                </div>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0f172a]/10 text-[#0f172a]">
                  <Bot className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-8 space-y-5 text-slate-600">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                    Canal WhatsApp
                  </p>
                  <p className="mt-2 text-base font-medium text-[#0f172a]">
                    “Hola Sofía, confirmamos tu reserva para mañana a las 10:00. ¿Deseas agregar recordatorios automáticos?”
                  </p>
                </div>
                <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-sm font-semibold text-[#0f172a]">
                    Rendimiento semanal
                  </p>
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>Chats resueltos</span>
                    <span className="text-[#0f172a]">1,248</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>Automatizaciones activas</span>
                    <span className="text-[#0f172a]">36</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>Satisfacción</span>
                    <span className="text-[#0f172a]">4.9/5</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-4 rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-slate-500">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-400">
                Indicadores clave
              </p>
              <div className="flex items-center justify-between text-sm">
                <span>Tiempo promedio de respuesta</span>
                <span className="font-semibold text-[#0f172a]">28 seg</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Integraciones activas</span>
                <span className="font-semibold text-[#0f172a]">12</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Escenarios automatizados</span>
                <span className="font-semibold text-[#0f172a]">+85</span>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-10">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                Capacidades
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-[#0f172a]">
                Todo lo que tu equipo necesita para conversar con seguridad.
              </h2>
            </div>
            <Button
              asChild
              variant="outline"
              className="rounded-full border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-[#0f172a] transition hover:bg-slate-100"
            >
              <Link href="/register">Solicitar asesoría</Link>
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {features.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0f172a]/10 text-[#0f172a]">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="text-lg font-semibold text-[#0f172a]">{title}</h3>
                <p className="text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/80">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-6 py-10 text-sm text-slate-500 sm:flex-row">
          <p>
            © {new Date().getFullYear()} Finnegans Chatbots. Todos los derechos
            reservados.
          </p>
          <div className="flex gap-6">
            <span>Privacidad</span>
            <span>Términos</span>
            <span>Soporte</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
