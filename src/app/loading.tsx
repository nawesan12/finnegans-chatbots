import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#04102D] text-white">
      <div className="flex flex-col items-center gap-5 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-base font-semibold">
          F.
        </span>
        <div className="space-y-2">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#4BC3FE]" />
          <h2 className="text-lg font-semibold">Preparando tu experiencia conversacional…</h2>
          <p className="max-w-sm text-sm text-white/70">
            Estamos sincronizando tus flujos, contactos y métricas. Esto tomará solo un instante.
          </p>
        </div>
      </div>
    </div>
  );
}
