"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, UserPlus, Upload } from "lucide-react";

const dropdownVariants = {
  hidden: { opacity: 0, y: -10, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.95 },
};

const CreateNewDropdown = ({
  isOpen,
  onImportClick,
  onNewContactClick,
  onNewFlowClick,
}: {
  isOpen: boolean;
  onImportClick: () => void;
  onNewContactClick: () => void;
  onNewFlowClick: () => void;
}) => {
  const menuItems = [
    {
      icon: Bot,
      label: "Nuevo flujo",
      action: onNewFlowClick,
    },
    {
      icon: UserPlus,
      label: "Nuevo contacto",
      action: onNewContactClick,
    },
    {
      icon: Upload,
      label: "Importar contactos",
      action: onImportClick,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={dropdownVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl z-50 overflow-hidden border border-gray-200"
        >
          <div className="py-2">
            {menuItems.map((item, index) => (
              <button
                key={index}
                type="button"
                onClick={item.action}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <item.icon className="h-4 w-4 mr-3" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreateNewDropdown;
