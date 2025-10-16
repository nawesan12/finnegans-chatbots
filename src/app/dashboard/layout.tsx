"use client";
import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import ImportContactsModal from "@/components/ImportContactsModal";
import AddContactModal from "@/components/AddContactModal";
import { pageVariants, pageTransition } from "@/lib/animations";
import { DashboardActionsProvider } from "@/lib/dashboard-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!token) {
      router.push("/login");
    }
  }, [token, hasHydrated, router]);

  if (!hasHydrated) {
    return null;
  }

  if (!user) {
    return null;
  }

  const pageTitles: { [key: string]: string } = {
    "/dashboard": "Panel de Control",
    "/dashboard/flows": "Flujos de Mensajes",
    "/dashboard/conversations": "Bandeja de conversaciones",
    "/dashboard/broadcasts": "Mensajes Masivos",
    "/dashboard/leads": "Leads",
    "/dashboard/logs": "Registros",
    "/dashboard/contacts": "Contactos",
    "/dashboard/settings": "Configuración",
  };

  const getPageTitle = (path: string) => {
    if (path.startsWith("/dashboard/contacts/")) {
      return "Detalle de Contacto";
    }

    return pageTitles[path] || "Dashboard";
  };

  const handleOpenImportModal = () => {
    setIsImportModalOpen(true);
  };

  const handleOpenAddContactModal = () => {
    setIsAddContactModalOpen(true);
  };

  const handleStartNewFlow = () => {
    router.push("/dashboard/flows?open=new");
  };

  return (
    <DashboardActionsProvider
      value={{
        openImportContacts: handleOpenImportModal,
        openNewContact: handleOpenAddContactModal,
        startNewFlow: handleStartNewFlow,
      }}
    >
      <div className="flex h-screen bg-gray-100 font-sans">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
        <main className="flex-1 flex flex-col overflow-x-hidden relative">
          <Header
            title={getPageTitle(pathname)}
            onImportClick={handleOpenImportModal}
            onNewContactClick={handleOpenAddContactModal}
            onNewFlowClick={handleStartNewFlow}
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
        <AddContactModal
          open={isAddContactModalOpen}
          onOpenChange={setIsAddContactModalOpen}
          userId={user.id}
        />
      </div>
    </DashboardActionsProvider>
  );
}
