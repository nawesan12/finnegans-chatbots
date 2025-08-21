"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MoreVertical, Upload } from "lucide-react";
import { itemVariants } from "@/lib/animations";
import Table from "@/components/dashboard/Table";
import { toast } from "sonner";

const ContactsPage = ({ onImportClick }) => {
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
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, []);

  const columns = [
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone" },
    {
      key: "tags",
      label: "Tags",
      render: (row) => (
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
    { key: "updatedAt", label: "Last Contact", render: (row) => new Date(row.updatedAt).toLocaleDateString() },
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
    return <div>Loading...</div>;
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
