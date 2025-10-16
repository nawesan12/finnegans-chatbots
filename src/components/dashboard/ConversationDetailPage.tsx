"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowLeft,
  Clock3,
  Copy,
  Download,
  MessageCircle,
  Phone,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import ConversationTimeline from "@/components/dashboard/conversations/ConversationTimeline";
import PageHeader from "@/components/dashboard/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UnauthorizedError,
  authenticatedFetch,
} from "@/lib/api-client";
import {
  formatAbsoluteTime,
  formatRelativeTime,
} from "@/lib/conversations/formatters";
import type { ConversationSummary } from "@/lib/conversations/types";

const MAX_MANUAL_REPLY_LENGTH = 1000;

const ConversationDetailPage: React.FC<{ contactId: string }> = ({ contactId }) => {
  const router = useRouter();
  const [conversation, setConversation] = useState<ConversationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [composerValue, setComposerValue] = useState("");

  const fetchConversation = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "initial") {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const response = await authenticatedFetch(
          `/api/conversations/${contactId}`,
        );
        const payload = (await response
          .json()
          .catch(() => null)) as
          | { error?: string; conversation?: ConversationSummary }
          | null;

        if (!response.ok || !payload?.conversation) {
          throw new Error(
            payload?.error ?? "No se pudo obtener la conversación",
          );
        }

        setConversation(payload.conversation);
        setErrorMessage(null);
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          router.push("/login");
          return;
        }
        const message =
          (error as Error)?.message ?? "Error al cargar la conversación";
        setErrorMessage(message);
        toast.error(message);
      } finally {
        if (mode === "initial") {
          setLoading(false);
        } else {
          setIsRefreshing(false);
        }
      }
    },
    [contactId, router],
  );

  useEffect(() => {
    void fetchConversation("initial");
  }, [fetchConversation]);

  const handleRefresh = () => {
    void fetchConversation("refresh");
  };

  const handleCopyPhone = useCallback(async () => {
    if (!conversation) {
      return;
    }
    try {
      await navigator.clipboard.writeText(conversation.contactPhone);
      toast.success("Número copiado al portapapeles");
    } catch (error) {
      toast.error("No pudimos copiar el número");
      console.error(error);
    }
  }, [conversation]);

  const handleExportConversation = useCallback(() => {
    if (!conversation) {
      return;
    }

    try {
      const exportPayload = {
        exportedAt: new Date().toISOString(),
        conversation,
      };
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: "application/json",
      });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName =
        (conversation.contactName ?? conversation.contactPhone)
          .replace(/[^a-z0-9_-]+/gi, "-")
          .toLowerCase() || "conversacion";
      link.href = objectUrl;
      link.download = `${safeName}-finnegans.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success("Descargamos el historial en formato JSON");
    } catch (error) {
      toast.error("No pudimos exportar la conversación");
      console.error(error);
    }
  }, [conversation]);

  const quickReplies = useMemo(() => {
    if (!conversation) {
      return [] as string[];
    }

    const baseGreetings = conversation.contactName
      ? `Hola ${conversation.contactName}, soy parte del equipo de Finnegans.`
      : `Hola ${conversation.contactPhone}, soy parte del equipo de Finnegans.`;

    const suggestions = new Set<string>([
      baseGreetings,
      "Gracias por tu mensaje, estoy revisando tu consulta y te respondo enseguida.",
      "¿Hay algo más en lo que pueda ayudarte?",
    ]);

    conversation.flows.forEach((flow) => {
      suggestions.add(
        `Gracias por seguir el flujo "${flow.name}". Si necesitás asistencia adicional, estoy disponible para ayudarte.`,
      );
    });

    const lastMessage = conversation.messages
      .slice()
      .reverse()
      .find((message) => message.direction === "in");

    if (lastMessage) {
      suggestions.add(
        `Recibimos tu último mensaje: "${lastMessage.text.slice(0, 80)}". ¿Podrías brindarme más detalles?`,
      );
    }

    return Array.from(suggestions);
  }, [conversation]);

  const handleApplyQuickReply = (value: string) => {
    setComposerValue((previous) => {
      if (!previous.trim()) {
        return value;
      }
      return `${previous}\n\n${value}`;
    });
  };

  const handleCopyReply = async () => {
    if (!composerValue.trim()) {
      toast.info("Escribe un mensaje para copiarlo");
      return;
    }
    try {
      await navigator.clipboard.writeText(composerValue);
      toast.success("Respuesta copiada");
    } catch (error) {
      toast.error("No pudimos copiar la respuesta");
      console.error(error);
    }
  };

  const handleOpenWhatsApp = () => {
    if (!conversation || !composerValue.trim()) {
      toast.info("Escribe un mensaje para enviarlo");
      return;
    }
    const encoded = encodeURIComponent(composerValue);
    const phone = conversation.contactPhone.replace(/[^0-9]/g, "");
    const url = `https://wa.me/${phone}?text=${encoded}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const charactersRemaining = MAX_MANUAL_REPLY_LENGTH - composerValue.length;
  const isComposerTooLong = charactersRemaining < 0;

  return (
    <div className="flex h-full flex-col gap-6 p-6 pb-24">
      <PageHeader
        title="Respuesta manual"
        description="Atiende esta conversación con un mensaje personalizado y deja registrado el historial."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/dashboard/conversations">Volver al listado</Link>
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={loading || isRefreshing}
              className="gap-2"
            >
              {isRefreshing ? (
                <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              )}
              Actualizar
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <span>
          Volver a la conversación anterior
        </span>
      </div>

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-80" />
            <Skeleton className="h-[400px] w-full" />
          </div>
          <div className="flex flex-col gap-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="mt-4 h-24 w-full" />
              <Skeleton className="mt-4 h-10 w-full" />
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-4 h-16 w-full" />
            </div>
          </div>
        </div>
      ) : conversation ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#04102D] text-white">
                  <UserAvatar name={conversation.contactName} />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {conversation.contactName ?? "Contacto sin nombre"}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                      {conversation.contactPhone}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatRelativeTime(conversation.lastActivity)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {conversation.flows.map((flow) => (
                      <Badge key={flow.id} variant="outline">
                        {flow.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleCopyPhone}
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  Copiar número
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleExportConversation}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Exportar JSON
                </Button>
              </div>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50 p-6">
              <ConversationTimeline messages={conversation.messages} />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Redactar respuesta manual
                  </h3>
                  <p className="text-sm text-slate-500">
                    Personaliza la respuesta y envíala por el canal que prefieras.
                  </p>
                </div>
                <Sparkles className="h-5 w-5 text-[#04102D]" aria-hidden="true" />
              </div>
              <Separator className="my-4" />
              <Textarea
                value={composerValue}
                onChange={(event) => setComposerValue(event.target.value)}
                placeholder="Escribe una respuesta personalizada..."
                maxLength={MAX_MANUAL_REPLY_LENGTH + 200}
                className="min-h-[180px] resize-y rounded-2xl border-slate-200"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>
                  {isComposerTooLong
                    ? `Te pasaste por ${Math.abs(charactersRemaining)} caracteres`
                    : `${Math.max(charactersRemaining, 0)} caracteres disponibles`}
                </span>
                {isComposerTooLong ? (
                  <Badge variant="destructive">Mensaje demasiado largo</Badge>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={handleCopyReply} className="gap-2">
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  Copiar respuesta
                </Button>
                <Button
                  onClick={handleOpenWhatsApp}
                  className="gap-2 bg-[#04102D] text-white hover:bg-[#030b1f]"
                  disabled={!composerValue.trim() || isComposerTooLong}
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Abrir en WhatsApp
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setComposerValue("")}
                  disabled={!composerValue}
                >
                  Limpiar
                </Button>
              </div>
              {quickReplies.length ? (
                <div className="mt-6 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Sugerencias rápidas
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.map((reply) => (
                      <Button
                        key={reply}
                        variant="secondary"
                        size="sm"
                        className="whitespace-normal rounded-2xl px-3 py-2 text-left text-xs"
                        onClick={() => handleApplyQuickReply(reply)}
                      >
                        {reply}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Resumen de la conversación</h3>
              <p className="mt-2 text-sm text-slate-500">
                Último mensaje registrado el {formatAbsoluteTime(conversation.lastActivity)}.
              </p>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Último mensaje del contacto
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {conversation.messages
                      .slice()
                      .reverse()
                      .find((message) => message.direction === "in")?.text ??
                      "El contacto no envió mensajes todavía."}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Mensajes totales
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {conversation.messages.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-slate-500">
          <MessageCircle className="h-12 w-12 text-slate-400" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-600">
            No encontramos la conversación solicitada.
          </p>
          {errorMessage ? (
            <p className="text-xs text-red-500">{errorMessage}</p>
          ) : null}
          <Button asChild variant="outline" className="mt-2">
            <Link href="/dashboard/conversations">Volver al listado</Link>
          </Button>
        </div>
      )}

      {errorMessage && conversation ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
};

const UserAvatar: React.FC<{ name: string | null }> = ({ name }) => {
  if (!name) {
    return <MessageCircle className="h-5 w-5" aria-hidden="true" />;
  }

  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  if (!initials) {
    return <MessageCircle className="h-5 w-5" aria-hidden="true" />;
  }

  return <span className="text-sm font-semibold">{initials}</span>;
};

export default ConversationDetailPage;
