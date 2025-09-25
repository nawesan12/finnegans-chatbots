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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowRight, Lock, MessageCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setUser } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      const { token, ...user } = data;
      setUser(user, token);
      toast.success(`Bienvenido de nuevo, ${data.name}!`);
      router.push("/dashboard");
    } else {
      const errorData = await response.json();
      toast.error(errorData.error || "Acceso fallido");
    }
  };
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#04102D] text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#4BC3FE] opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-10 h-96 w-96 rounded-full bg-white/30 opacity-10 blur-3xl" />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-[1.1fr,1fr]">
        <div className="hidden flex-col gap-10 lg:flex">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 text-sm font-medium uppercase tracking-[0.3em] text-white/70">
            <MessageCircle className="h-4 w-4" /> Conversaciones humanas
          </span>
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold leading-tight">
              Vuelve a conectar con tu plataforma de chatbots preferida.
            </h1>
            <p className="text-lg text-white/75">
              Gestiona cada interacción desde un único panel, diseña automatizaciones llenas de empatía y ofrece respuestas inmediatas en español para enamorar a tus clientes.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {["Monitoreo en tiempo real", "Seguridad end-to-end", "Plantillas inteligentes", "Reportes accionables"].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/80 backdrop-blur-xl"
              >
                <Lock className="h-4 w-4 text-[#4BC3FE]" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <Card className="relative w-full max-w-md justify-self-center overflow-hidden border-0 bg-white/95 text-[#04102D] shadow-2xl">
          <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-[#04102D] via-[#4BC3FE] to-[#04102D]" />
          <CardHeader className="space-y-3 pb-2 pt-8 text-center">
            <CardTitle className="text-3xl font-semibold text-[#04102D]">
              ¡Te estábamos esperando!
            </CardTitle>
            <CardDescription className="text-base text-[#04102D]/70">
              Inicia sesión para retomar tus automatizaciones y mantener conversaciones inolvidables.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin} className="space-y-6 px-6 pb-8">
            <CardContent className="grid gap-5 p-0">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-sm font-medium text-[#04102D]">
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="hola@tuempresa.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 border-[#04102D]/10 bg-white focus:border-[#4BC3FE] focus:ring-[#4BC3FE]/60"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-sm font-medium text-[#04102D]">
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 border-[#04102D]/10 bg-white focus:border-[#4BC3FE] focus:ring-[#4BC3FE]/60"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 p-0">
              <Button
                type="submit"
                className="h-12 w-full items-center justify-center gap-2 rounded-full bg-[#04102D] text-base font-semibold text-white transition hover:bg-[#04102D]/90"
              >
                Iniciar sesión
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-center text-sm text-[#04102D]/70">
                ¿Aún no tienes una cuenta?{" "}
                <Link href="/register" className="font-semibold text-[#04102D] underline decoration-[#4BC3FE] decoration-2 underline-offset-4 hover:text-[#4BC3FE]">
                  Crea tu acceso gratuito
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
