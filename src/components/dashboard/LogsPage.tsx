"use client";
import React from "react";
import { motion } from "framer-motion";
import { MoreVertical } from "lucide-react";
import { initialLogs } from "@/data/mock-data";
import { itemVariants } from "@/lib/animations";
import Table from "@/components/dashboard/Table";

const LogsPage = () => {
  const columns = [
    { key: "contact", label: "Contact" },
    { key: "flow", label: "Flow" },
    { key: "timestamp", label: "Timestamp" },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const colors = {
          Completed: "bg-green-100 text-green-800",
          "In Progress": "bg-blue-100 text-blue-800",
          Error: "bg-red-100 text-red-800",
        };
        return (
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
              colors[row.status]
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
  return (
    <div className="p-6">
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-lg shadow-md"
      >
        <Table columns={columns} data={initialLogs} />
      </motion.div>
    </div>
  );
};

export default LogsPage;
