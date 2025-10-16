"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  Bot,
  CircleHelp,
  Megaphone,
  MessageCircle,
  MessageSquare,
  NotebookPen,
  Settings,
  Users,
  ChevronLeft,
  ChevronRight,
  LifeBuoy,
  Mail,
} from "lucide-react";

import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type SidebarNavItem = {
  id: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  href: string;
  badge?: { label: string; variant?: "default" | "secondary" | "outline" };
  description?: string;
};

type SidebarSectionConfig = {
  id: string;
  label: string;
  items: SidebarNavItem[];
};

const SidebarNavLink = ({
  item,
  isCollapsed,
  isActive,
}: {
  item: SidebarNavItem;
  isCollapsed: boolean;
  isActive: boolean;
}) => {
  const Icon = item.icon;
  const isExternal = item.href.startsWith("http");

  return (
    <Link
      key={item.id}
      href={item.href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-[#4bc3fe] text-[#04102D] shadow-sm"
          : "text-white/80 hover:bg-white/10 hover:text-white",
      )}
      aria-current={isActive ? "page" : undefined}
      title={isCollapsed ? item.label : undefined}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition-colors",
          isActive && "border-transparent bg-white text-[#04102D]",
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      {!isCollapsed && (
        <motion.div
          className="flex flex-1 items-center justify-between"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex flex-1 flex-col">
            <span className="truncate text-sm font-semibold text-white">
              {item.label}
            </span>
            {item.description && (
              <span className="text-xs text-white/60">{item.description}</span>
            )}
          </div>
          {item.badge && (
            <Badge variant={item.badge.variant ?? "secondary"}>
              {item.badge.label}
            </Badge>
          )}
        </motion.div>
      )}
    </Link>
  );
};

const SidebarSectionGroup = ({
  section,
  pathname,
  isCollapsed,
}: {
  section: SidebarSectionConfig;
  pathname: string;
  isCollapsed: boolean;
}) => {
  return (
    <div className="space-y-2">
      {!isCollapsed && (
        <span className="px-3 text-xs font-semibold uppercase tracking-wider text-white/50">
          {section.label}
        </span>
      )}
      <div className="space-y-1">
        {section.items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              pathname.startsWith(`${item.href}/`));

          return (
            <SidebarNavLink
              key={item.id}
              item={item}
              isCollapsed={isCollapsed}
              isActive={isActive}
            />
          );
        })}
      </div>
    </div>
  );
};

const SidebarSupportCard = ({ isCollapsed }: { isCollapsed: boolean }) => {
  if (isCollapsed) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-inner">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
          <LifeBuoy className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="space-y-3 text-sm">
          <div className="space-y-1">
            <p className="font-semibold">¿Necesitas ayuda?</p>
            <p className="text-xs text-white/70">
              Explora guías paso a paso o contacta a nuestro equipo para recibir
              acompañamiento personalizado.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/help"
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/20"
            >
              Centro de ayuda
            </Link>
            <Link
              href="mailto:soporte@finnegans.ai"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#4bc3fe] transition-colors hover:text-white"
            >
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              Escríbenos
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const SidebarFooter = ({ isCollapsed }: { isCollapsed: boolean }) => {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="border-t border-white/10 p-4">
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-white/20">
          <Image
            src="/finnegans.svg"
            alt={user?.name ?? "Usuario"}
            width={40}
            height={40}
            className="h-full w-full object-cover"
          />
        </div>
        {!isCollapsed && (
          <motion.div
            className="flex flex-1 flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <span className="text-sm font-semibold text-white">
              {user?.name ?? "Admin"}
            </span>
            <span className="text-xs text-white/60">
              {user?.email ?? "admin@botflow.io"}
            </span>
          </motion.div>
        )}
        {!isCollapsed && (
          <Link
            href="/dashboard/settings"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/80 transition-colors hover:border-white/30 hover:text-white"
            aria-label="Ver configuración de la cuenta"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
};

const Sidebar = ({
  isCollapsed,
  setIsCollapsed,
}: {
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const pathname = usePathname();

  const navSections = useMemo<SidebarSectionConfig[]>(
    () => [
      {
        id: "overview",
        label: "General",
        items: [
          {
            id: "dashboard",
            icon: BarChart2,
            label: "Panel de Control",
            href: "/dashboard",
            description: "Resumen en tiempo real",
          },
          {
            id: "flows",
            icon: Bot,
            label: "Flujos",
            href: "/dashboard/flows",
            description: "Diseña automatizaciones",
          },
        ],
      },
      {
        id: "communication",
        label: "Comunicación",
        items: [
          {
            id: "broadcasts",
            icon: Megaphone,
            label: "Mensajes Masivos",
            href: "/dashboard/broadcasts",
            description: "Programaciones y campañas",
            badge: { label: "Nuevo", variant: "outline" },
          },
          {
            id: "conversations",
            icon: MessageCircle,
            label: "Conversaciones",
            href: "/dashboard/conversations",
            description: "Inbox centralizado",
          },
          {
            id: "leads",
            icon: NotebookPen,
            label: "Leads",
            href: "/dashboard/leads",
            description: "Seguimiento de oportunidades",
          },
          {
            id: "logs",
            icon: MessageSquare,
            label: "Registros",
            href: "/dashboard/logs",
            description: "Conversaciones y tickets",
          },
          {
            id: "contacts",
            icon: Users,
            label: "Contactos",
            href: "/dashboard/contacts",
            description: "Segmentos y etiquetas",
          },
        ],
      },
      {
        id: "resources",
        label: "Recursos",
        items: [
          {
            id: "knowledge",
            icon: CircleHelp,
            label: "Centro de ayuda",
            href: "/dashboard/help",
            description: "Guías, tutoriales y soporte",
          },
        ],
      },
    ],
    [],
  );

  return (
    <motion.aside
      animate={{ width: isCollapsed ? "5.5rem" : "18rem" }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="flex h-full flex-col overflow-hidden bg-[#04102D] text-white shadow-2xl"
    >
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        {!isCollapsed ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2"
          >
            <Image
              src="/finnegans.svg"
              alt="Finnegans"
              width={144}
              height={32}
              priority
            />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex h-10 w-10 items-center justify-center"
          ></motion.div>
        )}
        <button
          onClick={() => setIsCollapsed((previous) => !previous)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/80 transition-colors hover:border-white/30 hover:text-white"
          aria-label={isCollapsed ? "Expandir menú" : "Contraer menú"}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
        {navSections.map((section) => (
          <SidebarSectionGroup
            key={section.id}
            section={section}
            pathname={pathname}
            isCollapsed={isCollapsed}
          />
        ))}
        <SidebarSupportCard isCollapsed={isCollapsed} />
      </nav>
      <SidebarFooter isCollapsed={isCollapsed} />
    </motion.aside>
  );
};

export default Sidebar;
