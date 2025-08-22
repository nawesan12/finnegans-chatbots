"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreVertical, ChevronLeft, Save, Plus } from "lucide-react";
import { itemVariants } from "@/lib/animations";
import Table from "@/components/dashboard/Table";
import FlowBuilder from "@/components/flow-builder";
import { toast } from "sonner";

const FlowsPage = () => {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingFlow, setEditingFlow] = useState(null);
  const flowBuilderRef = useRef(null);

  const fetchFlows = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/flows");
      if (!response.ok) throw new Error("Failed to fetch flows");
      const data = await response.json();
      setFlows(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, []);

  const handleCreateNewFlow = () => {
    setEditingFlow({
      id: null, // No ID for a new flow
      name: "New Flow",
      definition: null, // Start with a blank canvas
    });
  };

  const handleSaveFlow = async () => {
    if (!editingFlow || !flowBuilderRef.current) return;

    try {
      const flowData = flowBuilderRef.current.getFlowData();
      const isNewFlow = !editingFlow.id;
      const url = isNewFlow ? "/api/flows" : `/api/flows/${editingFlow.id}`;
      const method = isNewFlow ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingFlow.name,
          definition: flowData,
        }),
      });

      if (!response.ok) throw new Error(`Failed to ${isNewFlow ? 'create' : 'save'} flow`);

      const updatedFlow = await response.json();
      setEditingFlow(updatedFlow);
      toast.success(`Flow ${isNewFlow ? 'created' : 'saved'} successfully!`);
      fetchFlows(); // Refresh the list
    } catch (error) {
      toast.error(error.message);
    }
  };

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
              colors[row.status] || "bg-gray-100 text-gray-800"
            }`}
          >
            {row.status}
          </span>
        );
      },
    },
    { key: "updatedAt", label: "Last Modified", render: (row) => new Date(row.updatedAt).toLocaleString() },
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

  if (loading && !editingFlow) {
    return <div>Loading flows...</div>;
  }

  return (
    <AnimatePresence>
      {editingFlow ? (
        <motion.div
          key="flow-builder"
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ duration: 0.4 }}
          className="h-full flex flex-col absolute top-0 left-0 w-full bg-white"
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
            <button
              onClick={handleSaveFlow}
              className="flex items-center gap-2 bg-[#4bc3fe] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-indigo-700"
            >
              <Save className="h-5 w-5 mr-1" /> Guardar Flujo
            </button>
          </div>
          <div className="flex-1">
            <FlowBuilder
              ref={flowBuilderRef}
              initialFlow={editingFlow.definition}
            />
          </div>
        </motion.div>
      ) : (
        <motion.div key="flow-list" className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Flows</h1>
            <button
              onClick={handleCreateNewFlow}
              className="flex items-center gap-2 bg-[#4bc3fe] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-indigo-700"
            >
              <Plus className="h-5 w-5" />
              Create New Flow
            </button>
          </div>
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
