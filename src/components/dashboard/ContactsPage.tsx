"use client";
import React from "react";
import { motion } from "framer-motion";
import { MoreVertical, Upload } from "lucide-react";
import { initialContacts } from "@/data/mock-data";
import { itemVariants } from "@/lib/animations";
import Table from "@/components/dashboard/Table";

const ContactsPage = ({ onImportClick }) => {
  const columns = [
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone" },
    {
      key: "tags",
      label: "Tags",
      render: (row) => (
        <div className="flex space-x-1">
          {row.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 text-xs font-semibold rounded-full bg-gray-200 text-gray-700"
            >
              {tag}
            </span>
          ))}
        </div>
      ),
    },
    { key: "lastContact", label: "Last Contact" },
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
        <Table columns={columns} data={initialContacts} />
      </motion.div>
    </div>
  );
};

export default ContactsPage;
