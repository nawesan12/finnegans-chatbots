"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/animations";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store";

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
        const response = await fetch(`/api/contacts/${contactId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error("No se pudo cargar el contacto");
        }
        const data = await response.json();
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
          <div className="space-y-3 rounded-lg bg-white p-6 shadow-md">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
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
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Información adicional
          </h3>
          <p className="text-sm text-gray-500">
            Utiliza esta sección para almacenar notas o información relevante
            sobre tus contactos. Próximamente podrás editar estos detalles
            directamente desde aquí.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ContactDetails;
