"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/animations";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { authenticatedFetch } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store";
import { Loader2, RefreshCcw, Send, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ContactTag {
  tag: {
    id: string;
    name: string;
  };
}

interface Contact {
  id: string;
  name: string | null;
  phone: string;
  createdAt: string;
  updatedAt: string;
  notes: string | null;
  tags: ContactTag[];
}

type ActivityDirection = "inbound" | "outbound" | "system" | "unknown";

type ContactActivity = {
  id: string;
  createdAt: string;
  status: string | null;
  direction: ActivityDirection;
  channel: string | null;
  flowName: string | null;
  messagePreview: string | null;
  metadata: { label: string; value: string }[];
};

type ActivityResponse = {
  items: ContactActivity[];
  nextCursor: string | null;
};

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const ContactDetails = ({ contactId }: { contactId: string }) => {
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [notesDraft, setNotesDraft] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [activity, setActivity] = useState<ContactActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [activityCursor, setActivityCursor] = useState<string | null>(null);
  const [isRefreshingActivity, setIsRefreshingActivity] = useState(false);
  const [isLoadingMoreActivity, setIsLoadingMoreActivity] = useState(false);
  const [messageDraft, setMessageDraft] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const activityDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-AR", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  );

  const directionStyles: Record<
    ActivityDirection,
    { label: string; badge: string; dot: string }
  > = useMemo(
    () => ({
      inbound: {
        label: "Entrante",
        badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
        dot: "bg-emerald-500",
      },
      outbound: {
        label: "Saliente",
        badge: "border-indigo-200 bg-indigo-50 text-indigo-700",
        dot: "bg-indigo-500",
      },
      system: {
        label: "Automático",
        badge: "border-slate-200 bg-slate-50 text-slate-600",
        dot: "bg-slate-400",
      },
      unknown: {
        label: "Sin clasificar",
        badge: "border-slate-200 bg-white text-slate-500",
        dot: "bg-slate-300",
      },
    }),
    [],
  );

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!token) {
      setContact(null);
      setLoading(false);
      return;
    }

    const fetchContact = async () => {
      try {
        setLoading(true);
        const response = await authenticatedFetch(
          `/api/contacts/${contactId}`,
        );
        if (!response.ok) {
          throw new Error("No se pudo cargar el contacto");
        }
        const data = (await response.json()) as Contact;
        setContact(data);
      } catch (error) {
        toast.error(
          (error as Error)?.message || "Error al obtener el contacto",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchContact();
  }, [contactId, hasHydrated, token]);

  useEffect(() => {
    if (contact) {
      setNotesDraft(contact.notes ?? "");
      return;
    }
    setNotesDraft("");
  }, [contact]);

  const originalNotes = contact?.notes ?? "";
  const notesChanged = notesDraft !== originalNotes;

  const parseErrorMessage = useCallback(async (response: Response) => {
    try {
      const data = await response.json();
      if (typeof data?.error === "string") {
        return data.error;
      }
    } catch (error) {
      console.error("Failed to parse response error", error);
    }
    return null;
  }, []);

  const fetchActivity = useCallback(
    async ({ mode, cursor }: { mode: "initial" | "refresh" | "append"; cursor?: string | null }) => {
      if (!token) {
        setActivity([]);
        setActivityCursor(null);
        setActivityError(null);
        setActivityLoading(false);
        setIsRefreshingActivity(false);
        setIsLoadingMoreActivity(false);
        return;
      }

      if (mode === "initial") {
        setActivityLoading(true);
        setActivityError(null);
      } else if (mode === "refresh") {
        setIsRefreshingActivity(true);
        setActivityError(null);
      } else {
        setIsLoadingMoreActivity(true);
      }

      try {
        const params = new URLSearchParams();
        params.set("limit", "15");
        if (cursor) {
          params.set("cursor", cursor);
        }

        const response = await authenticatedFetch(
          `/api/contacts/${contactId}/activity${params.size ? `?${params.toString()}` : ""}`,
        );

        if (!response.ok) {
          const message =
            (await parseErrorMessage(response)) ??
            "No se pudo cargar la actividad reciente.";
          throw new Error(message);
        }

        const data = (await response.json()) as ActivityResponse;
        setActivity((previous) =>
          mode === "append" ? [...previous, ...data.items] : data.items,
        );
        setActivityCursor(data.nextCursor ?? null);
        setActivityError(null);
      } catch (error) {
        const message =
          (error as Error)?.message ?? "No se pudo cargar la actividad reciente.";
        if (mode === "append") {
          toast.error(message);
        } else {
          setActivityError(message);
          toast.error(message);
        }
      } finally {
        if (mode === "initial") {
          setActivityLoading(false);
        } else if (mode === "refresh") {
          setIsRefreshingActivity(false);
        } else {
          setIsLoadingMoreActivity(false);
        }
      }
    },
    [contactId, parseErrorMessage, token],
  );

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    setActivity([]);
    setActivityCursor(null);

    void fetchActivity({ mode: "initial" });
  }, [fetchActivity, hasHydrated]);

  const handleSaveNotes = async () => {
    if (!contact) {
      return;
    }

    if (!token) {
      toast.error("No se pudo autenticar la sesión actual");
      return;
    }

    try {
      setIsSavingNotes(true);
      const response = await authenticatedFetch(`/api/contacts/${contact.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes: notesDraft }),
      });

      if (!response.ok) {
        let message = "No se pudieron guardar las notas";
        try {
          const errorData = await response.json();
          if (typeof errorData?.error === "string") {
            message = errorData.error;
          }
        } catch (error) {
          console.error("Failed to parse notes error", error);
        }
        throw new Error(message);
      }

      const updatedContact = (await response.json()) as Contact;
      setContact(updatedContact);
      setNotesDraft(updatedContact.notes ?? "");
      toast.success("Notas actualizadas");
      window.dispatchEvent(new CustomEvent("contacts:updated"));
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar las notas",
      );
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleRefreshActivity = () => {
    void fetchActivity({ mode: "refresh" });
  };

  const handleLoadMoreActivity = () => {
    if (!activityCursor) {
      return;
    }
    void fetchActivity({ mode: "append", cursor: activityCursor });
  };

  const handleSendMessage = async () => {
    if (!contact) return;
    const message = messageDraft.trim();
    if (!message) {
      toast.info("Por favor, escribe un mensaje para enviar.");
      return;
    }

    if (!token) {
      toast.error("No se pudo autenticar la sesión actual");
      return;
    }

    try {
      setIsSendingMessage(true);
      const response = await authenticatedFetch(
        `/api/contacts/${contact.id}/message`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        },
      );

      if (!response.ok) {
        const message =
          (await parseErrorMessage(response)) ?? "No se pudo enviar el mensaje.";
        throw new Error(message);
      }

      toast.success("Mensaje enviado correctamente");
      setMessageDraft("");
      handleRefreshActivity();
    } catch (error) {
      toast.error((error as Error)?.message ?? "Error al enviar el mensaje");
    } finally {
      setIsSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-4 w-32" />
        <div className="space-y-6">
          <div className="space-y-6 rounded-lg bg-white p-6 shadow-md">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-6 w-40" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-4 w-44" />
              </div>
            </div>
            <div className="border-t border-gray-100 pt-4">
              <Skeleton className="h-4 w-32" />
              <div className="mt-4 flex flex-wrap gap-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton
                    key={`contact-tag-skeleton-${index}`}
                    className="h-6 w-20 rounded-full"
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-4 rounded-lg bg-white p-6 shadow-md">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-24 w-full" />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-6 space-y-4">
        <Link
          href="/dashboard/contacts"
          className="inline-flex items-center text-sm font-medium text-[#8694ff] hover:text-indigo-700 transition-colors"
        >
          ← Volver a contactos
        </Link>
        <div className="bg-white rounded-lg shadow-md p-6 text-sm text-gray-500">
          No se encontró información del contacto.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Link
        href="/dashboard/contacts"
        className="inline-flex items-center text-sm font-medium text-[#8694ff] hover:text-indigo-700 transition-colors"
      >
        ← Volver a contactos
      </Link>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-lg shadow-md p-6 space-y-4"
        >
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">
                {contact.name || "Sin nombre"}
              </h2>
              <p className="text-gray-500 text-sm">ID: {contact.id}</p>
              <p className="mt-2 text-lg font-medium text-gray-700">
                {contact.phone}
              </p>
            </div>
            <div className="text-sm text-gray-500 space-y-1">
              <p>
                <span className="font-medium text-gray-600">Creado:</span>{" "}
                {formatDate(contact.createdAt)}
              </p>
              <p>
                <span className="font-medium text-gray-600">Actualizado:</span>{" "}
                {formatDate(contact.updatedAt)}
              </p>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Etiquetas
            </h3>
            {contact.tags && contact.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {contact.tags.map(({ tag }) => (
                  <span
                    key={tag.id}
                    className="px-3 py-1 rounded-full bg-[#eef2ff] text-[#4f46e5] text-xs font-medium"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Este contacto no tiene etiquetas asignadas.
              </p>
            )}
          </div>
        </motion.div>
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-lg shadow-md p-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Enviar mensaje directo
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Redacta y envía un mensaje de WhatsApp directamente a este
                contacto.
              </p>
            </div>
          </div>
          <Textarea
            value={messageDraft}
            onChange={(e) => setMessageDraft(e.target.value)}
            placeholder="Escribe tu mensaje aquí..."
            rows={4}
            className="mt-4"
            disabled={isSendingMessage}
          />
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSendMessage} disabled={isSendingMessage}>
              {isSendingMessage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar mensaje
                </>
              )}
            </Button>
          </div>
        </motion.div>
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-lg shadow-md p-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Notas internas
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Comparte contexto con tu equipo y mantén un historial centralizado.
              </p>
            </div>
            <span
              className={`inline-flex h-7 items-center justify-center rounded-full px-3 text-xs font-semibold ${notesChanged ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
            >
              {notesChanged ? "Cambios sin guardar" : "Sin cambios pendientes"}
            </span>
          </div>
          <Textarea
            value={notesDraft}
            onChange={(event) => setNotesDraft(event.target.value)}
            placeholder="Agrega insights, acuerdos o datos relevantes de este contacto."
            rows={6}
            className="mt-4"
            disabled={isSavingNotes}
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-400">
              Última actualización {formatDate(contact.updatedAt)}
            </p>
            <Button
              onClick={() => {
                void handleSaveNotes();
              }}
              disabled={!notesChanged || isSavingNotes}
              className="sm:w-auto"
            >
              {isSavingNotes ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar notas"
              )}
            </Button>
          </div>
        </motion.div>
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-lg shadow-md p-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Actividad reciente
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Revisa los últimos eventos registrados para este contacto.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshActivity}
              disabled={isRefreshingActivity || activityLoading}
              className="self-start"
            >
              {isRefreshingActivity ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Actualizando
                </>
              ) : (
                <>
                  <RefreshCcw className="mr-2 h-3.5 w-3.5" />
                  Actualizar
                </>
              )}
            </Button>
          </div>

          {activityLoading ? (
            <div className="mt-6 space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`activity-skeleton-${index}`} className="space-y-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          ) : activityError ? (
            <div className="mt-4 rounded-md border border-red-100 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-medium">{activityError}</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={handleRefreshActivity}
              >
                Volver a intentar
              </Button>
            </div>
          ) : activity.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              Aún no registramos actividad para este contacto.
            </p>
          ) : (
            <div className="mt-6 space-y-6">
              <ul className="space-y-6">
                {activity.map((item) => {
                  const directionStyle = directionStyles[item.direction] ?? directionStyles.unknown;
                  const eventDate = activityDateFormatter.format(new Date(item.createdAt));

                  return (
                    <li key={item.id} className="relative pl-6">
                      <span className="absolute left-0 top-2 flex h-full w-px justify-center">
                        <span className="h-full w-px bg-slate-200" />
                      </span>
                      <span
                        className={cn(
                          "absolute left-[1px] top-1.5 inline-flex h-3 w-3 items-center justify-center rounded-full",
                          directionStyle.dot,
                        )}
                      />
                      <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn("text-xs font-medium", directionStyle.badge)}
                            >
                              {directionStyle.label}
                            </Badge>
                            {item.channel ? (
                              <Badge
                                variant="outline"
                                className="border-slate-200 bg-white text-xs font-medium uppercase tracking-wide text-slate-600"
                              >
                                {item.channel}
                              </Badge>
                            ) : null}
                            {item.status ? (
                              <Badge
                                variant="outline"
                                className="border-slate-200 bg-white text-xs font-medium text-slate-600"
                              >
                                {item.status}
                              </Badge>
                            ) : null}
                          </div>
                          <span className="text-xs text-gray-500">{eventDate}</span>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-gray-700">
                          {item.messagePreview ?? "Sin contenido para mostrar."}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          {item.flowName ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 font-medium text-slate-600">
                              <Workflow className="h-3 w-3" />
                              {item.flowName}
                            </span>
                          ) : null}
                          {item.metadata.map((meta) => (
                            <Badge
                              key={`${item.id}-${meta.label}-${meta.value}`}
                              variant="outline"
                              className="border-slate-200 bg-white font-normal text-slate-600"
                            >
                              <span className="mr-1 font-medium text-slate-500">{meta.label}:</span>
                              {meta.value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {activityCursor ? (
                <div className="flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLoadMoreActivity}
                    disabled={isLoadingMoreActivity}
                  >
                    {isLoadingMoreActivity ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Cargando
                      </>
                    ) : (
                      "Ver más actividad"
                    )}
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ContactDetails;
