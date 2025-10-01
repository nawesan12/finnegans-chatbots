"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/animations";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { authenticatedFetch } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store";
import { Loader2 } from "lucide-react";

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
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

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
      </motion.div>
    </div>
  );
};

export default ContactDetails;
