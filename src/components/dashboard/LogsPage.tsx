"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { MoreVertical } from "lucide-react";
import { itemVariants } from "@/lib/animations";
import Table from "@/components/dashboard/Table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store";

const LogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const fetchLogs = useCallback(async () => {
    if (!token) {
      setLogs([]);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/logs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch logs");
      }
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      toast.error((error as Error)?.message ?? "Error al obtener registros");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    fetchLogs();
  }, [fetchLogs, hasHydrated]);

  const columns = [
    {
      key: "contact",
      label: "Contacto",
      render: (row: { contact: { name: string; phone: string } }) =>
        `${row.contact.name} (${row.contact.phone})`,
    },
    {
      key: "flow",
      label: "Flujo",
      render: (row: { flow: { name: string } }) => row.flow.name,
    },
    {
      key: "createdAt",
      label: "Marca de tiempo",
      render: (row: { createdAt: string }) =>
        new Date(row.createdAt).toLocaleString(),
    },
    {
      key: "status",
      label: "Estado",
      render: (row: { status: string }) => {
        const colors = {
          Completed: "bg-green-100 text-green-800",
          "In Progress": "bg-blue-100 text-blue-800",
          Error: "bg-red-100 text-red-800",
        };
        return (
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
              //@ts-expect-error bla
              colors[row.status] || "bg-gray-100 text-gray-800"
            }`}
          >
            {row.status}
          </span>
        );
      },
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
          <div className="space-y-2 border-b border-gray-100 p-6">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((column: { key: string; label: string }) => (
                    <th
                      key={`logs-loading-header-${column.key}`}
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Array.from({ length: 6 }).map((_, rowIndex) => (
                  <tr key={`logs-loading-row-${rowIndex}`}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-44" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <Skeleton className="h-6 w-24 rounded-full" />
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
        <Table columns={columns} data={logs} />
      </motion.div>
    </div>
  );
};

export default LogsPage;
