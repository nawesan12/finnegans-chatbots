"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, Plus } from "lucide-react";
import CreateNewDropdown from "@/components/CreateNewDropdown";

const Header = ({ title, onImportClick }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleImportAndCloseDropdown = () => {
    onImportClick();
    setIsDropdownOpen(false);
  };

  return (
    <header className="bg-white shadow-sm p-4 h-16 flex items-center justify-between border-b z-10">
      <h1 className="text-2xl font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center space-x-4">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-gray-700"
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
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
