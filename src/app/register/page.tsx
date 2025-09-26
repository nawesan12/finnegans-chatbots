"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });

    if (response.ok) {
      toast.success("Registration successful!");
      router.push("/login");
    } else {
      const errorData = await response.json();
      toast.error(errorData.error || "Registration failed");
    }
  };

  return (
    <div className="grid min-h-screen bg-white text-[#04102D] lg:grid-cols-[1.1fr,0.9fr]">
      <div className="flex flex-col justify-between bg-[#04102D]/5 px-8 py-10 sm:px-12 lg:px-16 mx-auto lg:max-w-7xl">
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

      <div className="flex items-center justify-center px-6 py-16 sm:px-10">
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
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 border-[#04102D]/20 bg-white focus:border-[#4BC3FE] focus:ring-[#4BC3FE]/40"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="h-12 w-full rounded-full bg-[#4BC3FE] text-base font-semibold text-[#04102D] hover:bg-[#3EB6F1]"
              >
                Crear cuenta
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
  );
}
