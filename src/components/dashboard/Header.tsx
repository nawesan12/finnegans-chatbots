"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { motion } from "framer-motion";
import { Search, Plus, LogOut } from "lucide-react";
import CreateNewDropdown from "@/components/CreateNewDropdown";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import GlobalSearchDialog from "@/components/dashboard/GlobalSearchDialog";

const Header = ({
  title,
  onImportClick,
  onNewContactClick,
}: {
  title: string;
  onImportClick: () => void;
  onNewContactClick: () => void;
}) => {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const element = dropdownRef.current;
      if (element && !element.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleImportAndCloseDropdown = () => {
    onImportClick();
    setIsDropdownOpen(false);
  };

  const handleNewContactAndCloseDropdown = () => {
    onNewContactClick();
    setIsDropdownOpen(false);
  };

  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    toast.success("Sesión cerrada correctamente");
    router.push("/login");
  };

  return (
    <header className="bg-white shadow-sm p-4 h-16 flex items-center justify-between border-b z-10">
      <h1 className="text-2xl font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center space-x-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsSearchOpen(true)}
          className="hidden items-center gap-2 rounded-lg border border-transparent bg-gray-100 px-3 py-2 text-sm text-gray-600 transition hover:border-indigo-100 hover:bg-indigo-50 hover:text-gray-800 md:flex"
          aria-label="Abrir buscador global"
        >
          <Search className="h-4 w-4" />
          <span>Buscar...</span>
          <kbd className="rounded-md border border-gray-300 bg-white px-1.5 py-0.5 text-[0.65rem] font-semibold text-gray-500 shadow-sm">
            ⌘K
          </kbd>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsSearchOpen(true)}
          className="p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-gray-700 md:hidden"
          aria-label="Abrir buscador global"
        >
          <Search className="h-5 w-5" />
        </motion.button>
        <div className="relative" ref={dropdownRef}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="bg-[#8694ff] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-indigo-700 flex items-center space-x-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Crear nuevo</span>
          </motion.button>
          <CreateNewDropdown
            isOpen={isDropdownOpen}
            onImportClick={handleImportAndCloseDropdown}
            onNewContactClick={handleNewContactAndCloseDropdown}
          />
        </div>
        <Button onClick={handleLogout} variant="outline" size="icon">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
      <GlobalSearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </header>
  );
};

export default Header;
