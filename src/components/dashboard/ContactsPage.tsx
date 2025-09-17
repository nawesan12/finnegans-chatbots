"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MoreVertical, Upload } from "lucide-react";
import { itemVariants } from "@/lib/animations";
import Table from "@/components/dashboard/Table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const ContactsPage = ({ onImportClick }: { onImportClick: () => void }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/contacts");
        if (!response.ok) {
          throw new Error("Failed to fetch contacts");
        }
        const data = await response.json();
        setContacts(data);
      } catch (error) {
        //@ts-expect-error bla
        toast.error(error?.message);
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, []);

  const columns = [
    {
      key: "name",
      label: "Nombre",
      render: (row: { id: string; name?: string | null }) => (
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
      render: (row: { tags: { tag: { id: string; name: string } }[] }) => (
        <div className="flex space-x-1">
          {row.tags?.map((t: { tag: { id: string; name: string } }) => (
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
      render: (row: { updatedAt: string }) =>
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
            onClick={onImportClick}
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
