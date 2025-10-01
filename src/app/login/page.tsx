"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowRight, Loader2, Lock, MessageCircle } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/footer";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setUser } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let message = "Acceso fallido";
        try {
          const errorData = await response.json();
          if (typeof errorData?.error === "string") {
            message = errorData.error;
          }
        } catch (error) {
          console.error("Failed to parse login error", error);
        }
        toast.error(message);
        return;
      }

      const data = await response.json();
      const { token, ...user } = data;
      setUser(user, token);
      toast.success(`Bienvenido de nuevo, ${data.name}!`);
      router.push("/dashboard");
    } catch (error) {
      console.error("Login request failed", error);
      toast.error("No pudimos iniciar sesión. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="flex min-h-screen flex-col bg-[#04102D] text-[#04102D]">
      <div className="grid flex-1 overflow-hidden lg:grid-cols-[0.9fr,1fr]">
        <div className="relative flex flex-col justify-between px-8 py-10 text-white sm:px-12 lg:max-w-7xl lg:px-16">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-sm font-semibold">
              F.
            </span>
            <div className="leading-tight">
              <p className="text-xs uppercase tracking-[0.28em] text-white/70">
                Finnegans
              </p>
              <p className="text-lg font-semibold">Chatbots</p>
            </div>
          </div>
          <div className="space-y-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
              <MessageCircle className="h-4 w-4" /> Operaciones conectadas
            </span>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight">
                Gestioná conversaciones clave con visibilidad completa.
              </h1>
              <p className="text-lg text-white/75">
                Monitorea equipos, automatiza respuestas y mantiene la
                coherencia de tu marca desde una sola plataforma.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                "Monitoreo en tiempo real",
                "Seguridad end-to-end",
                "Plantillas inteligentes",
                "Reportes accionables",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
                >
                  <Lock className="h-4 w-4 text-[#4BC3FE]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-white/60">
              Confían en nosotros
            </p>
            <div className="flex flex-wrap gap-3 text-sm font-medium text-white/70">
              {["NovaBank", "Grupo Sideral", "Lumen Retail"].map((logo) => (
                <span
                  key={logo}
                  className="rounded-full border border-white/20 px-4 py-2"
                >
                  {logo}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center bg-white px-6 py-16 sm:px-10">
          <Card className="w-full max-w-md border border-[#04102D]/10 shadow-xl">
            <CardHeader className="space-y-3 pb-2 pt-10 text-center">
              <CardTitle className="text-3xl font-semibold text-[#04102D]">
                ¡Te estábamos esperando!
              </CardTitle>
              <CardDescription className="text-base text-[#04102D]/70">
                Inicia sesión para retomar tus automatizaciones y mantener
                conversaciones inolvidables.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin} className="space-y-6 px-6 pb-10">
              <CardContent className="grid gap-5 p-0">
                <div className="grid gap-2 text-left">
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-[#04102D]"
                  >
                    Correo electrónico
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="hola@tuempresa.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    disabled={isSubmitting}
                    className="h-12 border-[#04102D]/20 bg-white focus:border-[#4BC3FE] focus:ring-[#4BC3FE]/40"
                  />
                </div>
                <div className="grid gap-2 text-left">
                  <Label
                    htmlFor="password"
                    className="text-sm font-medium text-[#04102D]"
                  >
                    Contraseña
                  </Label>
                  <PasswordInput
                    id="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    className="h-12 border-[#04102D]/20 bg-white focus:border-[#4BC3FE] focus:ring-[#4BC3FE]/40"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 p-0">
                <Button
                  type="submit"
                  className="h-12 w-full items-center justify-center gap-2 rounded-full bg-[#04102D] text-base font-semibold text-white transition hover:bg-[#04102D]/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Ingresando...
                    </>
                  ) : (
                    <>
                      Iniciar sesión
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
                <p className="text-center text-sm text-[#04102D]/70">
                  ¿Aún no tienes una cuenta?{" "}
                  <Link
                    href="/register"
                    className="font-semibold text-[#04102D] underline decoration-[#4BC3FE] decoration-2 underline-offset-4 hover:text-[#4BC3FE]"
                  >
                    Crea tu acceso gratuito
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
      <MarketingFooter variant="dark" />
    </div>
  );
}
