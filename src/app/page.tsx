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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#04102D] via-[#04102D] to-[#4BC3FE] text-white">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#4BC3FE] opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-white/40 opacity-20 blur-3xl" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-lg">
            <Sparkles className="h-6 w-6 text-[#4BC3FE]" />
          </span>
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-white/70">
              Finnegans
            </p>
            <p className="text-xl font-semibold">Chatbots</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-white/80 md:flex">
          <span>Soluciones</span>
          <span>Precios</span>
          <span>Historias de éxito</span>
          <span>Recursos</span>
        </nav>
        <div className="hidden items-center gap-4 md:flex">
          <Button
            asChild
            variant="ghost"
            className="border-0 bg-transparent text-white hover:bg-white/10"
          >
            <Link href="/login">Ingresar</Link>
          </Button>
          <Button
            asChild
            className="bg-white text-[#04102D] shadow-lg shadow-[#04102D]/20 hover:bg-white/90"
          >
            <Link href="/register">Comenzar gratis</Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-20 px-6 pb-24 pt-10">
        <section className="grid gap-16 md:grid-cols-[1.1fr,0.9fr] md:items-center">
          <div className="space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 text-sm font-medium uppercase tracking-[0.3em] text-white/70">
              <Sparkles className="h-4 w-4" /> Innovación latina
            </span>
            <div className="space-y-6">
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                Impulsa tus conversaciones con chatbots que hablan tu idioma.
              </h1>
              <p className="max-w-xl text-lg text-white/80">
                Diseña experiencias conversacionales memorables, automatiza
                tareas repetitivas y sorprende a tus clientes con respuestas
                precisas y humanas en cada canal.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                asChild
                className="flex items-center gap-2 rounded-full bg-[#4BC3FE] px-8 py-6 text-base font-semibold text-[#04102D] shadow-lg shadow-[#04102D]/20 transition hover:bg-[#35aaf2]"
              >
                <Link href="/register">
                  Empieza ahora
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full border-white/40 bg-white/5 px-8 py-6 text-base font-semibold text-white transition hover:bg-white/10"
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
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl"
                >
                  <p className="text-3xl font-bold text-white">{stat.number}</p>
                  <p className="mt-2 text-sm uppercase tracking-wide text-white/70">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-white/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-8 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-white/60">
                    Panel activo
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    Asistente virtual
                  </p>
                </div>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4BC3FE]/20 text-[#4BC3FE]">
                  <Bot className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-8 space-y-6 text-white/80">
                <div className="rounded-2xl bg-white/10 p-5">
                  <p className="text-sm uppercase tracking-wide text-white/60">
                    Canal WhatsApp
                  </p>
                  <p className="mt-2 text-lg font-medium text-white">
                    &ldquo;Hola Sofía, confirmamos tu reserva para mañana a las
                    10:00. ¿Deseas agregar recordatorios automáticos?&rdquo;
                  </p>
                </div>
                <div className="grid gap-4 rounded-2xl border border-white/10 bg-[#04102D]/60 p-5">
                  <p className="text-sm font-semibold text-white">
                    Rendimiento semanal
                  </p>
                  <div className="flex items-center justify-between text-sm text-white/60">
                    <span>Chats resueltos</span>
                    <span className="text-white">1,248</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-white/60">
                    <span>Automatizaciones activas</span>
                    <span className="text-white">36</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-white/60">
                    <span>Satisfacción</span>
                    <span className="text-white">4.9/5</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 rounded-3xl border border-white/10 bg-white/10 p-10 backdrop-blur-xl md:grid-cols-3">
          {features.map(({ title, description, icon: Icon }) => (
            <div
              key={title}
              className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#04102D]/40 p-6"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#4BC3FE]/20 text-[#4BC3FE]">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="text-xl font-semibold text-white">{title}</h3>
              <p className="text-sm text-white/70">{description}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-6 pb-12 text-sm text-white/60 sm:flex-row">
        <p>
          © {new Date().getFullYear()} Finnegans Chatbots. Todos los derechos
          reservados.
        </p>
        <div className="flex gap-6">
          <span>Privacidad</span>
          <span>Términos</span>
          <span>Soporte</span>
        </div>
      </footer>
    </div>
  );
}
