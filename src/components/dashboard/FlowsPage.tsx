"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreVertical, ChevronLeft, Save } from "lucide-react";
import { initialFlows } from "@/data/mock-data";
import { itemVariants } from "@/lib/animations";
import Table from "@/components/dashboard/Table";
import FlowBuilder from "@/components/FlowBuilder";

const FlowsPage = () => {
  const [flows, setFlows] = useState(initialFlows);
  const [editingFlow, setEditingFlow] = useState(null);
  const columns = [
    { key: "name", label: "Flow Name" },
    { key: "trigger", label: "Trigger Keyword" },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const colors = {
          Active: "bg-green-100 text-green-800",
          Draft: "bg-yellow-100 text-yellow-800",
          Inactive: "bg-gray-100 text-gray-800",
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
    { key: "lastModified", label: "Last Modified" },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => setEditingFlow(row)}
            className="text-[#4bc3fe] hover:text-indigo-900 font-medium"
          >
            Edit
          </button>
          <button className="text-gray-500 hover:text-gray-800">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AnimatePresence>
      {editingFlow ? (
        <motion.div
          key="flow-builder"
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ duration: 0.4 }}
          className="h-full flex flex-col absolute top-0 left-0 w-full"
        >
          <div className="p-4 bg-white border-b flex items-center justify-between z-10">
            <button
              onClick={() => setEditingFlow(null)}
              className="text-gray-600 hover:text-gray-900 flex items-center"
            >
              <ChevronLeft className="h-5 w-5 mr-1" /> Volver a Flujos
            </button>
            <h2 className="text-xl font-semibold text-gray-800">
              {editingFlow.name}
            </h2>
            <button className="flex items-center gap-2 bg-[#4bc3fe] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-indigo-700">
              <Save className="h-5 w-5 mr-1" /> Guardar Flujo
            </button>
          </div>
          <div className="flex-1">
            <FlowBuilder />
          </div>
        </motion.div>
      ) : (
        <motion.div key="flow-list" className="p-6">
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-lg shadow-md"
          >
            <Table columns={columns} data={flows} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FlowsPage;
