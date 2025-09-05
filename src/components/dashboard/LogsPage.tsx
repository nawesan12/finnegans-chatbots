"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MoreVertical } from "lucide-react";
import { itemVariants } from "@/lib/animations";
import Table from "@/components/dashboard/Table";
import { toast } from "sonner";

const LogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/logs");
        if (!response.ok) {
          throw new Error("Failed to fetch logs");
        }
        const data = await response.json();
        setLogs(data);
      } catch (error) {
        //@ts-expect-error bla
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

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
    return <div>Cargando...</div>;
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
