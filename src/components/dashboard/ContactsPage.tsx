"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MoreVertical, Upload } from "lucide-react";
import { itemVariants } from "@/lib/animations";
import Table from "@/components/dashboard/Table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store";
import { useDashboardActions } from "@/lib/dashboard-context";

type ContactTagRelation = { tag: { id: string; name: string } };

type ContactRow = {
  id: string;
  name?: string | null;
  phone: string;
  updatedAt: string;
  tags?: ContactTagRelation[];
};

const ContactsPage = () => {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const dashboardActions = useDashboardActions();

  const fetchContacts = useCallback(async () => {
    if (!token) {
      setContacts([]);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/contacts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch contacts");
      }
      const data: ContactRow[] = await response.json();
      setContacts(data);
    } catch (error) {
      toast.error((error as Error)?.message ?? "Error al obtener contactos");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    fetchContacts();
  }, [fetchContacts, hasHydrated]);

  useEffect(() => {
    const handler = () => {
      void fetchContacts();
    };
    window.addEventListener("contacts:updated", handler);
    return () => window.removeEventListener("contacts:updated", handler);
  }, [fetchContacts]);

  const columns = [
    {
      key: "name",
      label: "Nombre",
      render: (row: ContactRow) => (
        <Link
          href={`/dashboard/contacts/${row.id}`}
          className="text-[#8694ff] hover:text-indigo-700 font-medium transition-colors"
        >
          {row.name || "Sin nombre"}
        </Link>
      ),
    },
    { key: "phone", label: "Telefono" },
    {
      key: "tags",
      label: "Etiquetas",
      render: (row: ContactRow) => (
        <div className="flex space-x-1">
          {row.tags?.map((t) => (
            <span
              key={t.tag.id}
              className="px-2 text-xs font-semibold rounded-full bg-gray-200 text-gray-700"
            >
              {t.tag.name}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "updatedAt",
      label: "Last Contact",
      render: (row: ContactRow) =>
        new Date(row.updatedAt).toLocaleDateString(),
    },
    {
      key: "actions",
      label: "Actions",
      render: () => (
        <button className="text-[#4bc3fe] hover:text-indigo-900">
          <MoreVertical className="h-5 w-5" />
        </button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="p-6">
        <motion.div
          variants={itemVariants}
          className="overflow-hidden rounded-lg bg-white shadow-md"
        >
          <div className="flex justify-end border-b border-gray-100 p-4">
            <Skeleton className="h-9 w-40 rounded-md" />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((column: { key: string; label: string }) => (
                    <th
                      key={`contacts-loading-header-${column.key}`}
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr key={`contacts-loading-row-${rowIndex}`}> 
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: 2 }).map((_, tagIndex) => (
                          <Skeleton
                            key={`contacts-loading-tag-${rowIndex}-${tagIndex}`}
                            className="h-6 w-16 rounded-full"
                          />
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <Skeleton className="h-6 w-6 rounded-full" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-lg shadow-md"
      >
        <div className="p-4 flex justify-end">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => dashboardActions?.openImportContacts?.()}
            className="bg-[#8694ff] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-indigo-700 flex items-center space-x-2 transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span>Importar Contactos</span>
          </motion.button>
        </div>
        <Table columns={columns} data={contacts} />
      </motion.div>
    </div>
  );
};

export default ContactsPage;
