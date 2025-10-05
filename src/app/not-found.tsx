import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, LifeBuoy } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[#04102D] text-white">
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-24 text-center sm:px-10">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -left-16 top-24 h-40 w-40 rounded-3xl border border-white/20" />
          <div className="absolute -right-12 bottom-16 h-32 w-32 rounded-2xl border border-[#4BC3FE]/30" />
          <div className="absolute left-1/2 top-10 h-24 w-24 -translate-x-1/2 rounded-full border border-white/10" />
        </div>

        <div className="relative flex flex-col items-center gap-6">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-lg font-semibold">
            F.
          </span>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
              Página no encontrada
            </p>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Parece que tomamos un desvío inesperado.
            </h1>
            <p className="mx-auto max-w-2xl text-base text-white/70">
              La ruta que estás buscando no existe o cambió recientemente. Vuelve al inicio
              o cuéntanos qué estabas intentando hacer para ayudarte a retomarlo.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              className="h-12 rounded-full bg-white px-6 text-base font-semibold text-[#04102D] hover:bg-white/90"
            >
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Volver al inicio
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-full border-white/30 bg-transparent px-6 text-base font-semibold text-white hover:border-white/50 hover:bg-white/10"
            >
              <Link href="/#contacto">
                <LifeBuoy className="mr-2 h-4 w-4" />
                Hablar con soporte
              </Link>
            </Button>
          </div>
          <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-6 text-left text-white/80 sm:max-w-xl">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
              <ArrowLeft className="h-4 w-4" />
              Quizás buscabas…
            </p>
            <ul className="grid gap-2 text-sm">
              <li className="rounded-xl border border-white/10 bg-white/5 px-4 py-2">
                Dashboard de conversaciones para monitorear tus flujos activos.
              </li>
              <li className="rounded-xl border border-white/10 bg-white/5 px-4 py-2">
                Centro de ayuda con guías de implementación y mejores prácticas.
              </li>
              <li className="rounded-xl border border-white/10 bg-white/5 px-4 py-2">
                Ajustes de WhatsApp Cloud para verificar tu webhook.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
