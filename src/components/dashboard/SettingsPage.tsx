"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";

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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { authenticatedFetch } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store";
import type {
  MetaVerificationResult,
  MetaVerificationStepStatus,
} from "@/lib/whatsapp/verification-types";
import {
  CheckCircle2,
  CircleDashed,
  Copy,
  Eye,
  EyeOff,
  Info,
  Lightbulb,
  RefreshCcw,
  ShieldCheck,
  Loader2,
  Trash2,
  AlertTriangle,
  Clock,
  MinusCircle,
  XCircle,
} from "lucide-react";

const EMPTY_SETTINGS = {
  metaVerifyToken: "",
  metaAppSecret: "",
  metaAccessToken: "",
  metaPhoneNumberId: "",
  metaBusinessAccountId: "",
  metaPhonePin: "",
};

type SettingsState = typeof EMPTY_SETTINGS;

const normalizeSettings = (input: Partial<SettingsState> | null | undefined) => ({
  metaVerifyToken: input?.metaVerifyToken ?? "",
  metaAppSecret: input?.metaAppSecret ?? "",
  metaAccessToken: input?.metaAccessToken ?? "",
  metaPhoneNumberId: input?.metaPhoneNumberId ?? "",
  metaBusinessAccountId: input?.metaBusinessAccountId ?? "",
  metaPhonePin: input?.metaPhonePin ?? "",
});

const SettingsPage = () => {
  const [settings, setSettings] = useState<SettingsState>(EMPTY_SETTINGS);
  const [initialSettings, setInitialSettings] =
    useState<SettingsState>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const copyResetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visibleSecrets, setVisibleSecrets] = useState<
    Record<"metaAppSecret" | "metaAccessToken" | "metaPhonePin", boolean>
  >({
    metaAppSecret: false,
    metaAccessToken: false,
    metaPhonePin: false,
  });
  const [verificationResult, setVerificationResult] =
    useState<MetaVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!token) {
      setSettings(EMPTY_SETTINGS);
      setInitialSettings(EMPTY_SETTINGS);
      setVerificationResult(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await authenticatedFetch("/api/settings");

      if (!response.ok) {
        throw new Error("No se pudieron cargar los ajustes actuales");
      }

      const data = await response.json();
      const normalized = normalizeSettings(data);
      setSettings(normalized);
      setInitialSettings(normalized);
      setVerificationResult(null);
    } catch (error) {
      toast.error(
        (error as Error)?.message ?? "Error al recuperar la configuración",
      );
      setSettings(EMPTY_SETTINGS);
      setVerificationResult(null);
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

  const handleClearCredentials = useCallback(async () => {
    if (!token) {
      toast.error("No se pudo autenticar la sesión actual");
      return;
    }

    try {
      setIsClearing(true);
      const response = await authenticatedFetch("/api/settings", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(
          "No se pudieron eliminar las credenciales guardadas",
        );
      }

      const data = await response.json();
      const normalized = normalizeSettings(data);
      setSettings(normalized);
      setInitialSettings(normalized);
      setVerificationResult(null);
      setCopiedField(null);
      toast.success(
        "Credenciales personales eliminadas. Se aplicarán los valores globales.",
      );
    } catch (error) {
      toast.error(
        (error as Error)?.message ??
          "No se pudieron limpiar las credenciales almacenadas",
      );
    } finally {
      setIsClearing(false);
    }
  }, [token]);

  const isDirty = useMemo(
    () =>
      Object.keys(settings).some((key) => {
        const typedKey = key as keyof SettingsState;
        return settings[typedKey] !== initialSettings[typedKey];
      }),
    [initialSettings, settings],
  );

  const canSubmit = Boolean(token) && (isDirty || !initialSettings.metaVerifyToken);

  const statusItems = useMemo(
    () => [
      {
        key: "metaVerifyToken",
        label: "Verify Token",
        description: "Valida la suscripción del webhook de Meta.",
        isFilled: Boolean(settings.metaVerifyToken?.trim()),
      },
      {
        key: "metaAppSecret",
        label: "App Secret",
        description: "Usado para comprobar la integridad de los mensajes.",
        isFilled: Boolean(settings.metaAppSecret?.trim()),
      },
      {
        key: "metaAccessToken",
        label: "Access Token",
        description: "Permite enviar mensajes a través de la API.",
        isFilled: Boolean(settings.metaAccessToken?.trim()),
      },
      {
        key: "metaPhoneNumberId",
        label: "Phone Number ID",
        description: "Identifica el número de WhatsApp que enviará mensajes.",
        isFilled: Boolean(settings.metaPhoneNumberId?.trim()),
      },
      {
        key: "metaPhonePin",
        label: "PIN de registro",
        description:
          "Permite registrar automáticamente tu número si Meta lo solicita.",
        isFilled: Boolean(settings.metaPhonePin?.trim()),
      },
      {
        key: "metaBusinessAccountId",
        label: "Business Account ID",
        description:
          "Asocia los Flows con tu cuenta de WhatsApp Business (WABA).",
        isFilled: Boolean(settings.metaBusinessAccountId?.trim()),
      },
    ],
    [
      settings.metaAccessToken,
      settings.metaAppSecret,
      settings.metaBusinessAccountId,
      settings.metaPhonePin,
      settings.metaPhoneNumberId,
      settings.metaVerifyToken,
    ],
  );

  const completionCount = statusItems.filter((item) => item.isFilled).length;

  const completionPercentage = statusItems.length
    ? Math.round((completionCount / statusItems.length) * 100)
    : 0;

  const remainingFields = statusItems.length - completionCount;

  const webhookUrl = useMemo(() => {
    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    const runtimeOrigin =
      typeof window !== "undefined" ? window.location.origin : undefined;

    const baseUrl = (configuredUrl || runtimeOrigin || "https://tu-dominio.com")
      .replace(/\/$/, "");

    return `${baseUrl}/api/webhook`;
  }, []);

  const toggleSecretVisibility = (
    field: "metaAppSecret" | "metaAccessToken" | "metaPhonePin",
  ) => {
    setVisibleSecrets((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const verificationSummary = useMemo(() => {
    if (!verificationResult) {
      return null;
    }

    if (!verificationResult.success) {
      return "Revisa los pasos marcados en rojo para completar la configuración.";
    }

    if (verificationResult.hasWarnings) {
      return "La conexión responde, pero aún quedan tareas por finalizar.";
    }

    return "Todo listo: las credenciales respondieron correctamente.";
  }, [verificationResult]);

  const verificationBadge = useMemo(() => {
    if (!verificationResult) {
      return null;
    }

    if (!verificationResult.success) {
      return { label: "Acción requerida", variant: "destructive" as const };
    }

    if (verificationResult.hasWarnings) {
      return { label: "Con observaciones", variant: "outline" as const };
    }

    return { label: "Verificación exitosa", variant: "secondary" as const };
  }, [verificationResult]);

  const lastCheckedAt = useMemo(() => {
    if (!verificationResult) {
      return null;
    }

    const parsedDate = new Date(verificationResult.checkedAt);
    if (Number.isNaN(parsedDate.getTime())) {
      return verificationResult.checkedAt;
    }

    return parsedDate.toLocaleString();
  }, [verificationResult]);

  const getStatusIcon = (status: MetaVerificationStepStatus) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="size-5 text-emerald-500" />;
      case "warning":
        return <AlertTriangle className="size-5 text-amber-500" />;
      case "skipped":
        return <MinusCircle className="size-5 text-gray-300" />;
      default:
        return <XCircle className="size-5 text-red-500" />;
    }
  };

  const handleVerifyAccount = useCallback(async () => {
    if (!token) {
      toast.error("No se pudo autenticar la sesión actual");
      return;
    }

    try {
      setIsVerifying(true);
      const response = await authenticatedFetch("/v1/account/verify", {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as
        | MetaVerificationResult
        | { error?: string }
        | null;

      if (!response.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof (payload as { error?: unknown }).error === "string"
            ? ((payload as { error?: string }).error as string)
            : "No se pudo ejecutar la verificación";
        throw new Error(message);
      }

      if (
        !payload ||
        typeof payload !== "object" ||
        !("steps" in payload) ||
        !Array.isArray((payload as { steps?: unknown }).steps)
      ) {
        throw new Error("Respuesta inválida de la verificación");
      }

      const result = payload as MetaVerificationResult;
      setVerificationResult(result);

      if (result.success && !result.hasWarnings) {
        toast.success("Configuración verificada correctamente.");
      } else if (result.success) {
        toast.message(
          "Verificación completada con observaciones. Revisa los detalles resaltados.",
        );
      } else {
        toast.error(
          "Detectamos problemas en la verificación. Revisa el detalle para corregirlos.",
        );
      }
    } catch (error) {
      toast.error(
        (error as Error)?.message ??
          "No se pudo ejecutar la verificación de la cuenta",
      );
    } finally {
      setIsVerifying(false);
    }
  }, [token]);

  const handleCopy = useCallback(
    async (value: string, label: string, key: string) => {
      if (!value) {
        toast.error(`No hay ${label.toLowerCase()} para copiar todavía.`);
        return;
      }

      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        toast.error("El portapapeles no está disponible en este navegador.");
        return;
      }

      try {
        await navigator.clipboard.writeText(value);
        toast.success(`${label} copiado en el portapapeles`);
        setCopiedField(key);
        if (copyResetTimeout.current) {
          clearTimeout(copyResetTimeout.current);
        }
        copyResetTimeout.current = setTimeout(() => setCopiedField(null), 2000);
      } catch (error) {
        toast.error("No se pudo copiar el contenido");
        console.error(error);
      }
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (copyResetTimeout.current) {
        clearTimeout(copyResetTimeout.current);
      }
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      toast.error("No se pudo autenticar la sesión actual");
      return;
    }

    try {
      setIsSaving(true);
      const response = await authenticatedFetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
      setVerificationResult(null);
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
        description="Gestiona las credenciales necesarias para conectar tus flujos de WhatsApp Business con Finnegans."
        actions={
          <>
            <Badge
              variant={isDirty ? "secondary" : "outline"}
              className="text-xs uppercase tracking-wide"
            >
              {isDirty ? "Cambios sin guardar" : "Sin cambios pendientes"}
            </Badge>
            <Button
              type="button"
              variant="outline"
              onClick={() => void fetchSettings()}
              disabled={loading || isSaving || isClearing}
            >
              <RefreshCcw className="size-4" />
              Recargar datos
            </Button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
        <div>
          {loading ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>WhatsApp Cloud</CardTitle>
                  <CardDescription>
                    Configura las credenciales proporcionadas por Meta para habilitar
                    el envío y recepción de mensajes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </CardContent>
                <CardFooter className="flex flex-wrap gap-3">
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-32" />
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Webhook de recepción</CardTitle>
                  <CardDescription>
                    Preparando detalles de la URL de escucha.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>WhatsApp Cloud</CardTitle>
                  <CardDescription>
                    Estos datos permiten vincular tu número de WhatsApp Business con la
                    plataforma. Solo el personal autorizado debería modificarlos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="metaVerifyToken">Verify Token</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopy(
                            settings.metaVerifyToken,
                            "Verify Token",
                            "metaVerifyToken",
                          )
                        }
                      >
                        <Copy className="size-4" />
                        {copiedField === "metaVerifyToken" ? "Copiado" : "Copiar"}
                      </Button>
                    </div>
                    <Input
                      id="metaVerifyToken"
                      value={settings.metaVerifyToken}
                      onChange={(event) =>
                        handleChange("metaVerifyToken", event.target.value)
                      }
                      placeholder="Ej: finnegans-webhook-token"
                    />
                    <p className="text-xs text-gray-500">
                      Se usa para validar la suscripción del webhook de Meta. Debe
                      coincidir con el valor configurado en la app de Facebook.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="metaAppSecret">App Secret</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            toggleSecretVisibility("metaAppSecret")
                          }
                        >
                          {visibleSecrets.metaAppSecret ? (
                            <>
                              <EyeOff className="size-4" />
                              Ocultar
                            </>
                          ) : (
                            <>
                              <Eye className="size-4" />
                              Mostrar
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopy(
                              settings.metaAppSecret,
                              "App Secret",
                              "metaAppSecret",
                            )
                          }
                        >
                          <Copy className="size-4" />
                          {copiedField === "metaAppSecret" ? "Copiado" : "Copiar"}
                        </Button>
                      </div>
                    </div>
                    <Input
                      id="metaAppSecret"
                      type={visibleSecrets.metaAppSecret ? "text" : "password"}
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="metaAccessToken">Access Token</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            toggleSecretVisibility("metaAccessToken")
                          }
                        >
                          {visibleSecrets.metaAccessToken ? (
                            <>
                              <EyeOff className="size-4" />
                              Ocultar
                            </>
                          ) : (
                            <>
                              <Eye className="size-4" />
                              Mostrar
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopy(
                              settings.metaAccessToken,
                              "Access Token",
                              "metaAccessToken",
                            )
                          }
                        >
                          <Copy className="size-4" />
                          {copiedField === "metaAccessToken" ? "Copiado" : "Copiar"}
                        </Button>
                      </div>
                    </div>
                    <Input
                      id="metaAccessToken"
                      type={visibleSecrets.metaAccessToken ? "text" : "password"}
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="metaPhoneNumberId">Phone Number ID</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopy(
                            settings.metaPhoneNumberId,
                            "Phone Number ID",
                            "metaPhoneNumberId",
                          )
                        }
                      >
                        <Copy className="size-4" />
                        {copiedField === "metaPhoneNumberId" ? "Copiado" : "Copiar"}
                      </Button>
                    </div>
                    <Input
                      id="metaPhoneNumberId"
                      value={settings.metaPhoneNumberId}
                      onChange={(event) =>
                        handleChange("metaPhoneNumberId", event.target.value)
                      }
                      placeholder="ID numérico del número registrado"
                    />
                    <p className="text-xs text-gray-500">
                      Identificador único del número de WhatsApp que enviará los
                      mensajes. Puedes consultarlo en el panel de Meta Business.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="metaPhonePin">PIN de registro</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSecretVisibility("metaPhonePin")}
                        >
                          {visibleSecrets.metaPhonePin ? (
                            <>
                              <EyeOff className="size-4" />
                              Ocultar
                            </>
                          ) : (
                            <>
                              <Eye className="size-4" />
                              Mostrar
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopy(
                              settings.metaPhonePin,
                              "PIN de registro",
                              "metaPhonePin",
                            )
                          }
                        >
                          <Copy className="size-4" />
                          {copiedField === "metaPhonePin" ? "Copiado" : "Copiar"}
                        </Button>
                      </div>
                    </div>
                    <Input
                      id="metaPhonePin"
                      type={visibleSecrets.metaPhonePin ? "text" : "password"}
                      inputMode="numeric"
                      value={settings.metaPhonePin}
                      onChange={(event) =>
                        handleChange("metaPhonePin", event.target.value)
                      }
                      placeholder="PIN de 6 dígitos configurado en Meta"
                    />
                    <p className="text-xs text-gray-500">
                      Necesario para registrar automáticamente tu número si la API
                      lo exige (por ejemplo, al enviar campañas masivas).
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="metaBusinessAccountId">
                        Business Account ID
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopy(
                            settings.metaBusinessAccountId,
                            "Business Account ID",
                            "metaBusinessAccountId",
                          )
                        }
                      >
                        <Copy className="size-4" />
                        {copiedField === "metaBusinessAccountId"
                          ? "Copiado"
                          : "Copiar"}
                      </Button>
                    </div>
                    <Input
                      id="metaBusinessAccountId"
                      value={settings.metaBusinessAccountId}
                      onChange={(event) =>
                        handleChange(
                          "metaBusinessAccountId",
                          event.target.value,
                        )
                      }
                      placeholder="ID de tu cuenta de WhatsApp Business"
                    />
                    <p className="text-xs text-gray-500">
                      Necesario para crear y sincronizar WhatsApp Flows mediante la
                      API Graph.
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    disabled={!isDirty || isSaving || isClearing}
                  >
                    Restablecer
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void handleClearCredentials()}
                    disabled={isSaving || isClearing || loading}
                  >
                    {isClearing ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Eliminando credenciales
                      </>
                    ) : (
                      <>
                        <Trash2 className="size-4" />
                        Quitar credenciales guardadas
                      </>
                    )}
                  </Button>
                  <Button
                    type="submit"
                    disabled={!canSubmit || isSaving || isClearing}
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
                <CardContent className="space-y-3">
                  <code className="block rounded-md bg-gray-100 px-4 py-3 text-sm text-gray-700">
                    {webhookUrl}
                  </code>
                  <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <Info className="size-4 text-[#8694ff]" />
                      <span>
                        Verifica que la URL esté accesible públicamente antes de
                        pegarla en Meta.
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(webhookUrl, "Webhook", "webhook")}
                    >
                      <Copy className="size-4" />
                      {copiedField === "webhook" ? "Copiado" : "Copiar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          )}
        </div>
        <div className="space-y-6">
          {loading ? (
            <Card>
              <CardHeader>
                <CardTitle>Resumen de configuración</CardTitle>
                <CardDescription>
                  Evaluando el estado de los campos configurables.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Resumen de configuración</CardTitle>
                <CardDescription>
                  Controla rápidamente qué credenciales están completas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Nivel de configuración
                  </p>
                  <div className="mt-2 h-2 rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-[#8694ff] transition-all"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {completionCount === statusItems.length
                      ? "¡Todo listo! Puedes comenzar a utilizar la integración."
                      : `Completa ${remainingFields} campo${
                          remainingFields === 1 ? "" : "s"
                        } pendiente${
                          remainingFields === 1 ? "" : "s"
                        } para finalizar la configuración.`}
                  </p>
                </div>
                <ul className="space-y-4">
                  {statusItems.map((item) => (
                    <li key={item.key} className="flex gap-3">
                      <div className="mt-0.5">
                        {item.isFilled ? (
                          <CheckCircle2 className="size-5 text-emerald-500" />
                        ) : (
                          <CircleDashed className="size-5 text-gray-300" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {item.label}
                        </p>
                        <p className="text-xs text-gray-500">{item.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Verificación rápida</CardTitle>
              <CardDescription>
                Ejecuta comprobaciones automáticas sobre tu número y credenciales.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                type="button"
                variant="outline"
                className="flex w-full items-center justify-center gap-2"
                onClick={() => {
                  void handleVerifyAccount();
                }}
                disabled={loading || isSaving || isClearing || isVerifying}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-4" />
                    Ejecutar verificación
                  </>
                )}
              </Button>
              {verificationResult ? (
                <>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {verificationBadge ? (
                        <Badge variant={verificationBadge.variant}>
                          {verificationBadge.label}
                        </Badge>
                      ) : null}
                      {lastCheckedAt ? (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="size-3.5" />
                          <span>Última comprobación: {lastCheckedAt}</span>
                        </div>
                      ) : null}
                    </div>
                    {verificationSummary ? (
                      <p className="mt-2 text-sm text-gray-700">
                        {verificationSummary}
                      </p>
                    ) : null}
                  </div>
                  <ul className="space-y-3">
                    {verificationResult.steps.map((step) => (
                      <li
                        key={step.key}
                        className="flex gap-3 rounded-lg border border-gray-200 bg-white/80 p-3"
                      >
                        <div className="mt-0.5">{getStatusIcon(step.status)}</div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            {step.label}
                          </p>
                          <p className="text-xs text-gray-500">{step.message}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-xs text-gray-500">
                  Ejecuta la verificación para confirmar que Meta reconoce tus credenciales y el número configurado.
                </p>
              )}
              <div className="rounded-lg border border-dashed border-gray-200 bg-white/70 p-3 text-xs text-gray-500">
                <p>
                  El botón anterior invoca
                  <code className="mx-1 rounded bg-gray-200 px-1 py-0.5 text-[11px] font-mono">
                    POST /v1/account/verify
                  </code>
                  con tus credenciales almacenadas.
                </p>
                <p className="mt-2">
                  Después de validar, apunta el webhook a
                  <code className="mx-1 rounded bg-gray-200 px-1 py-0.5 text-[11px] font-mono">
                    {webhookUrl}
                  </code>
                  y suscríbete a los eventos <span className="font-medium">messages</span>,
                  <span className="font-medium"> message_status_update</span> y
                  <span className="font-medium"> message_template_status_update</span> en Meta.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Buenas prácticas de seguridad</CardTitle>
              <CardDescription>
                Mantén tus credenciales protegidas y evita interrupciones en tu
                integración.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 size-4 text-emerald-500" />
                  <span>
                    Limita el acceso a este panel solo al personal con permisos y
                    rota los secretos periódicamente.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Lightbulb className="mt-0.5 size-4 text-amber-500" />
                  <span>
                    Documenta los cambios en un registro interno para mantener la
                    trazabilidad de las credenciales utilizadas.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Info className="mt-0.5 size-4 text-[#8694ff]" />
                  <span>
                    Si migras de entorno, actualiza el Verify Token y el Access Token
                    antes de publicar la nueva URL del webhook.
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
