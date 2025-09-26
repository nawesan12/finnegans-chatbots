"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";

import PageHeader from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store";

const EMPTY_SETTINGS = {
  metaVerifyToken: "",
  metaAppSecret: "",
  metaAccessToken: "",
  metaPhoneNumberId: "",
};

type SettingsState = typeof EMPTY_SETTINGS;

const normalizeSettings = (input: Partial<SettingsState> | null | undefined) => ({
  metaVerifyToken: input?.metaVerifyToken ?? "",
  metaAppSecret: input?.metaAppSecret ?? "",
  metaAccessToken: input?.metaAccessToken ?? "",
  metaPhoneNumberId: input?.metaPhoneNumberId ?? "",
});

const SettingsPage = () => {
  const [settings, setSettings] = useState<SettingsState>(EMPTY_SETTINGS);
  const [initialSettings, setInitialSettings] =
    useState<SettingsState>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const fetchSettings = useCallback(async () => {
    if (!token) {
      setSettings(EMPTY_SETTINGS);
      setInitialSettings(EMPTY_SETTINGS);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/settings", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("No se pudieron cargar los ajustes actuales");
      }

      const data = await response.json();
      const normalized = normalizeSettings(data);
      setSettings(normalized);
      setInitialSettings(normalized);
    } catch (error) {
      toast.error(
        (error as Error)?.message ?? "Error al recuperar la configuración",
      );
      setSettings(EMPTY_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    void fetchSettings();
  }, [fetchSettings, hasHydrated]);

  const handleChange = (field: keyof SettingsState, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setSettings(initialSettings);
  };

  const isDirty = useMemo(
    () =>
      Object.keys(settings).some((key) => {
        const typedKey = key as keyof SettingsState;
        return settings[typedKey] !== initialSettings[typedKey];
      }),
    [initialSettings, settings],
  );

  const canSubmit = Boolean(token) && (isDirty || !initialSettings.metaVerifyToken);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      toast.error("No se pudo autenticar la sesión actual");
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error("No se pudieron guardar los ajustes");
      }

      toast.success("Ajustes guardados correctamente");
      const normalized = normalizeSettings(settings);
      setInitialSettings(normalized);
      setSettings(normalized);
    } catch (error) {
      toast.error((error as Error)?.message ?? "Error al guardar la configuración");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Configuración"
        description="Gestiona las credenciales necesarias para conectar tus flujos de WhatsApp Business con Finnegan."
      />
      {loading ? (
        <Card>
          <CardHeader>
            <CardTitle>Meta Cloud API</CardTitle>
            <CardDescription>
              Configura las credenciales proporcionadas por Meta para habilitar el
              envío y recepción de mensajes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
          <CardFooter className="flex flex-wrap gap-3">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </CardFooter>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Meta Cloud API</CardTitle>
              <CardDescription>
                Estos datos permiten vincular tu número de WhatsApp Business con la
                plataforma. Solo el personal autorizado debería modificarlos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="metaVerifyToken">Verify Token</Label>
                <Input
                  id="metaVerifyToken"
                  value={settings.metaVerifyToken}
                  onChange={(event) =>
                    handleChange("metaVerifyToken", event.target.value)
                  }
                  placeholder="Ej: finnegan-webhook-token"
                />
                <p className="text-xs text-gray-500">
                  Se usa para validar la suscripción del webhook de Meta. Debe
                  coincidir con el valor configurado en la app de Facebook.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="metaAppSecret">App Secret</Label>
                <Input
                  id="metaAppSecret"
                  type="password"
                  value={settings.metaAppSecret}
                  onChange={(event) =>
                    handleChange("metaAppSecret", event.target.value)
                  }
                  placeholder="Ingresa el App Secret de tu aplicación"
                />
                <p className="text-xs text-gray-500">
                  Protege este valor; es necesario para verificar la integridad de
                  los mensajes recibidos.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="metaAccessToken">Access Token</Label>
                <Input
                  id="metaAccessToken"
                  type="password"
                  value={settings.metaAccessToken}
                  onChange={(event) =>
                    handleChange("metaAccessToken", event.target.value)
                  }
                  placeholder="Token de acceso generado en Meta"
                />
                <p className="text-xs text-gray-500">
                  Token permanente o de larga duración con permisos para enviar
                  mensajes mediante la API de WhatsApp Business Cloud.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="metaPhoneNumberId">Phone Number ID</Label>
                <Input
                  id="metaPhoneNumberId"
                  value={settings.metaPhoneNumberId}
                  onChange={(event) =>
                    handleChange("metaPhoneNumberId", event.target.value)
                  }
                  placeholder="ID numérico del número registrado"
                />
                <p className="text-xs text-gray-500">
                  Identificador único del número de WhatsApp que enviarà los
                  mensajes. Puedes consultarlo en el panel de Meta Business.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={!isDirty}
              >
                Restablecer
              </Button>
              <Button
                type="submit"
                disabled={!canSubmit || isSaving}
                className="bg-[#8694ff] text-white hover:bg-indigo-700"
              >
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Webhook de recepción</CardTitle>
              <CardDescription>
                Copia esta URL en la configuración de tu aplicación de Meta para
                recibir los mensajes entrantes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <code className="block rounded-md bg-gray-100 px-4 py-3 text-sm text-gray-700">
                {`${process.env.NEXT_PUBLIC_APP_URL ?? "https://tu-dominio.com"}/api/webhooks/meta`}
              </code>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
};

export default SettingsPage;
