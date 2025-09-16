"use client";
import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  Bot,
  Megaphone,
  MessageSquare,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const Sidebar = ({
  isCollapsed,
  setIsCollapsed,
}: {
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const pathname = usePathname();
  const navItems = [
    {
      id: "dashboard",
      icon: BarChart2,
      label: "Panel de Control",
      href: "/dashboard",
    },
    { id: "flows", icon: Bot, label: "Flujos", href: "/dashboard/flows" },
    {
      id: "broadcasts",
      icon: Megaphone,
      label: "Mensajes Masivos",
      href: "/dashboard/broadcasts",
    },
    {
      id: "logs",
      icon: MessageSquare,
      label: "Registros",
      href: "/dashboard/logs",
    },
    {
      id: "contacts",
      icon: Users,
      label: "Contactos",
      href: "/dashboard/contacts",
    },
    {
      id: "settings",
      icon: Settings,
      label: "Configuración",
      href: "/dashboard/settings",
    },
  ];

  return (
    <motion.aside
      animate={{ width: isCollapsed ? "5rem" : "16rem" }}
      transition={{ duration: 0.3 }}
      className="bg-[#04102D] text-white flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-700 h-16">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center"
          >
            <Image src="/finnegans.svg" alt="Logo" width={200} height={200} />
          </motion.div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-gray-700"
        >
          {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`flex items-center p-3 rounded-lg transition-colors ${
              pathname === item.href ? "bg-[#4bc3fe]" : "hover:bg-gray-700"
            }`}
          >
            <item.icon className="h-5 w-5" />
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="ml-4 font-medium"
              >
                {item.label}
              </motion.span>
            )}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center">
          <Image
            className="h-10 w-10 rounded-full object-cover"
            src="/finnegans.svg"
            alt="Admin"
            width={40}
            height={40}
          />
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="ml-3"
            >
              <p className="text-sm font-medium">Admin User</p>
              <p className="text-xs text-gray-400">admin@botflow.io</p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
