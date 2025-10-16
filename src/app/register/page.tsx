"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { Loader2 } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/footer";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) {
      return;
    }

    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }

    if (!acceptedPolicies) {
      toast.error(
        "Debes aceptar la Política de Privacidad y los Términos y Condiciones para continuar.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        let message = "No pudimos crear tu cuenta";
        try {
          const errorData = await response.json();
          if (typeof errorData?.error === "string") {
            message = errorData.error;
          }
        } catch (error) {
          console.error("Failed to parse register error", error);
        }
        toast.error(message);
        return;
      }

      const data = await response.json();
      toast.success(`¡Bienvenido/a, ${data.name}!`);
      router.push("/login");
    } catch (error) {
      console.error("Register request failed", error);
      toast.error("Hubo un problema al crear tu cuenta. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#04102D]">
      <div className="grid flex-1 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="mx-auto flex flex-col justify-between bg-[#04102D]/5 px-8 py-10 sm:px-12 lg:max-w-7xl lg:px-16">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#04102D] text-sm font-semibold text-white">
              F.
            </span>
            <div className="leading-tight">
              <p className="text-xs uppercase tracking-[0.28em] text-[#04102D]/60">
                Finnegans
              </p>
              <p className="text-lg font-semibold text-[#04102D]">Chatbots</p>
            </div>
          </div>
          <div className="space-y-10">
            <span className="inline-flex items-center rounded-full border border-[#04102D]/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[#04102D]/60">
              Nuevo comienzo
            </span>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                Creá tu instancia y alineá a tus equipos desde el primer día.
              </h1>
              <p className="text-lg text-[#04102D]/70">
                Diseñamos herramientas inteligentes para acercarte más a tus
                metas. Configurá accesos, canalizá conversaciones y colaborá con
                tu organización sin perder control.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                "Onboarding acompañado",
                "Roles y permisos",
                "Integraciones seguras",
                "Reportes ejecutivos",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[#04102D]/10 bg-white px-4 py-3 text-sm text-[#04102D]/70"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.28em] text-[#04102D]/60">
              Tiempo estimado
            </p>
            <p className="text-2xl font-semibold text-[#04102D]">
              Menos de 4 semanas para salir a producción
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center bg-white px-6 py-16 sm:px-10">
          <Card className="w-full max-w-md border border-[#04102D]/10 shadow-xl">
            <CardHeader className="space-y-2 pb-2 pt-10 text-center">
              <CardTitle className="text-3xl font-semibold text-[#04102D]">
                Crear cuenta
              </CardTitle>
              <CardDescription className="text-base text-[#04102D]/70">
                Completa tus datos para comenzar la aventura.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleRegister}>
              <CardContent className="grid gap-5">
                <div className="grid gap-2 text-left">
                  <Label
                    htmlFor="name"
                    className="text-sm font-medium text-[#04102D]"
                  >
                    Nombre completo
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="María González"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    disabled={isSubmitting}
                    className="h-12 border-[#04102D]/20 bg-white focus:border-[#4BC3FE] focus:ring-[#4BC3FE]/40"
                  />
                </div>
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
                    placeholder="correo@ejemplo.com"
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
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    className="h-12 border-[#04102D]/20 bg-white focus:border-[#4BC3FE] focus:ring-[#4BC3FE]/40"
                  />
                </div>
                <div className="grid gap-2 text-left">
                  <Label
                    htmlFor="confirm-password"
                    className="text-sm font-medium text-[#04102D]"
                  >
                    Confirmar contraseña
                  </Label>
                  <PasswordInput
                    id="confirm-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    className="h-12 border-[#04102D]/20 bg-white focus:border-[#4BC3FE] focus:ring-[#4BC3FE]/40"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <div className="flex items-start gap-3 text-left text-xs text-[#04102D]/70">
                  <input
                    id="register-legal"
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border border-[#04102D]/30 text-[#04102D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4BC3FE] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    checked={acceptedPolicies}
                    onChange={(event) => setAcceptedPolicies(event.target.checked)}
                    disabled={isSubmitting}
                    required
                  />
                  <label htmlFor="register-legal" className="leading-relaxed">
                    Confirmo que he leído y acepto la{" "}
                    <Link
                      href="/politica-de-privacidad"
                      className="font-semibold text-[#04102D] underline decoration-[#4BC3FE] decoration-2 underline-offset-4 hover:text-[#4BC3FE]"
                    >
                      Política de Privacidad
                    </Link>{" "}
                    y los{" "}
                    <Link
                      href="/terminos-y-condiciones"
                      className="font-semibold text-[#04102D] underline decoration-[#4BC3FE] decoration-2 underline-offset-4 hover:text-[#4BC3FE]"
                    >
                      Términos y Condiciones
                    </Link>
                    .
                  </label>
                </div>
                <Button
                  type="submit"
                  className="h-12 w-full rounded-full bg-[#4BC3FE] text-base font-semibold text-[#04102D] hover:bg-[#3EB6F1]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creando cuenta...
                    </>
                  ) : (
                    "Crear cuenta"
                  )}
                </Button>
                <p className="text-center text-sm text-[#04102D]/70">
                  ¿Ya tienes una cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => router.push("/login")}
                    className="font-semibold text-[#04102D] underline decoration-[#4BC3FE] decoration-2 underline-offset-4 hover:text-[#4BC3FE]"
                  >
                    Inicia sesión aquí
                  </button>
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}
