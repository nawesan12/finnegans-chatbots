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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#04102D]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#04102D] via-[#0b2a6d] to-[#4bC3FE]"
      />
      <div
        aria-hidden
        className="absolute -left-48 -top-48 h-72 w-72 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#4bC3FE]/20 blur-3xl"
      />
      <div className="relative z-10 mx-4 flex w-full max-w-5xl flex-col gap-10 lg:flex-row lg:items-center">
        <div className="space-y-6 text-white">
          <p className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.3em]">
            Nuevo comienzo
          </p>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Regístrate y descubre experiencias digitales memorables
          </h1>
          <p className="max-w-xl text-base text-white/80 sm:text-lg">
            Diseñamos herramientas inteligentes para acercarte más a tus metas.
            Crea una cuenta para personalizar tus proyectos y colaborar con tu
            equipo en un espacio dinámico e inspirador.
          </p>
        </div>
        <Card className="w-full max-w-md border-none bg-white/90 shadow-2xl backdrop-blur">
          <CardHeader className="space-y-2 text-center">
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
                <Label htmlFor="name" className="text-sm font-medium text-[#04102D]">
                  Nombre completo
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="María González"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-[#4bC3FE]/40 focus-visible:ring-[#4bC3FE]"
                />
              </div>
              <div className="grid gap-2 text-left">
                <Label htmlFor="email" className="text-sm font-medium text-[#04102D]">
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-[#4bC3FE]/40 focus-visible:ring-[#4bC3FE]"
                />
              </div>
              <div className="grid gap-2 text-left">
                <Label htmlFor="password" className="text-sm font-medium text-[#04102D]">
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-[#4bC3FE]/40 focus-visible:ring-[#4bC3FE]"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full bg-[#4bC3FE] text-[#04102D] hover:bg-[#66ccff]"
              >
                Crear cuenta
              </Button>
              <p className="text-center text-sm text-[#04102D]/70">
                ¿Ya tienes una cuenta?{' '}
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="font-semibold text-[#4bC3FE] underline-offset-2 hover:underline"
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
