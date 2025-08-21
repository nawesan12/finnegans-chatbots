"use client";
import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import ImportContactsModal from "@/components/ImportContactsModal";
import { pageVariants, pageTransition } from "@/lib/animations";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const pathname = usePathname();

  const pageTitles: { [key: string]: string } = {
    "/dashboard": "Panel de Control",
    "/dashboard/flows": "Flujos de Mensajes",
    "/dashboard/logs": "Registros",
    "/dashboard/contacts": "Contactos",
    "/dashboard/settings": "Configuración",
  };

  const handleOpenImportModal = () => {
    setIsImportModalOpen(true);
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      <main className="flex-1 flex flex-col overflow-x-hidden relative">
        <Header
          title={pageTitles[pathname] || "Dashboard"}
          onImportClick={handleOpenImportModal}
        />
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <ImportContactsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
}
