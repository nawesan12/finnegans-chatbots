"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FlowNodeType } from "./types";

import {
  FileUp,
  MessageSquare,
  Filter,
  Clock3,
  Code2,
  Variable,
  Image as ImageIcon,
  Headphones,
  GitBranch,
  Flag,
  Link2,
  Workflow,
} from "lucide-react";

// ---------- Types ----------
export type PaletteItem = {
  type: FlowNodeType;
  label: string;
  icon: LucideIcon;
  hint: string;
  // optional keywords to mejorar el search
  keywords?: string[];
  // opcional: deshabilitar ítems por permisos/estado
  disabled?: boolean;
};

type PaletteProps = {
  onAdd: (type: FlowNodeType) => void;
  /** Si querés inyectar/overridear los items desde afuera */
  items?: PaletteItem[];
  className?: string;
  /** Callback opcional para reaccionar al texto de búsqueda */
  onSearchChange?: (q: string) => void;
  /** Placeholder del buscador */
  searchPlaceholder?: string;
};

// ---------- Default items (mantiene tus ítems 1:1) ----------
const defaultPalette: PaletteItem[] = [
  {
    type: "trigger",
    label: "Entrante",
    icon: FileUp,
    hint: "Palabra clave que inicia el flujo",
  },
  {
    type: "message",
    label: "Mensaje",
    icon: MessageSquare,
    hint: "Enviar texto (plantillas admitidas)",
  },
  {
    type: "whatsapp_flow",
    label: "WhatsApp Flow",
    icon: Workflow,
    hint: "Invitar a completar un Flow remoto",
    keywords: ["meta", "flow", "form", "cta"],
  },
  {
    type: "options",
    label: "Opciones",
    icon: Filter,
    hint: "Mostrar opciones rápidas",
  },
  { type: "delay", label: "Retraso", icon: Clock3, hint: "Esperar N segundos" },
  {
    type: "condition",
    label: "Condición",
    icon: GitBranch,
    hint: "Rama con expresión",
  },
  {
    type: "api",
    label: "Llamada API",
    icon: Code2,
    hint: "Obtener datos externos",
  },
  {
    type: "assign",
    label: "Variable",
    icon: Variable,
    hint: "context.var = value",
  },
  {
    type: "media",
    label: "Enviar Recurso",
    icon: ImageIcon,
    hint: "Image/Doc/Video/Audio",
  },
  {
    type: "handoff",
    label: "Enviar a Agente",
    icon: Headphones,
    hint: "Route to agent",
  },
  { type: "goto", label: "Ir a", icon: Link2, hint: "Saltar a nodo" },
  { type: "end", label: "Fin", icon: Flag, hint: "Finalizar flujo" },
];

// ---------- Utils ----------
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

const matches = (item: PaletteItem, q: string) => {
  if (!q) return true;
  const nQ = normalize(q);
  const hay = [item.label, item.hint, item.type, ...(item.keywords || [])]
    .filter(Boolean)
    .map(String)
    .map(normalize)
    .some((field) => field.includes(nQ));
  return hay;
};

const highlightMatch = (text: string, q: string) => {
  if (!q) return text;
  const nText = normalize(text);
  const nQ = normalize(q);
  const idx = nText.indexOf(nQ);
  if (idx === -1) return text;

  // Reconstruye con <mark> respetando los caracteres originales
  const start = [...text].slice(0, idx).join("");
  const mid = [...text].slice(idx, idx + q.length).join("");
  const end = [...text].slice(idx + q.length).join("");

  return (
    <>
      {start}
      <mark className="rounded-sm bg-yellow-200/60 px-0.5">{mid}</mark>
      {end}
    </>
  );
};

// ---------- Component ----------
export function Palette({
  onAdd,
  items = defaultPalette,
  className = "",
  onSearchChange,
  searchPlaceholder = "Buscar nodos ( / )",
}: PaletteProps) {
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce de la búsqueda
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 120);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    onSearchChange?.(debouncedQ);
  }, [debouncedQ, onSearchChange]);

  // Atajo: presionar "/" enfoca el buscador
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Evita capturar cuando estás escribiendo dentro del input
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        (e.target as HTMLElement)?.isContentEditable
      )
        return;

      if (e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(
    () => items.filter((p) => matches(p, debouncedQ)),
    [items, debouncedQ],
  );

  useEffect(() => {
    // Reset activeIndex cuando cambia el set
    setActiveIndex((idx) =>
      filtered.length ? Math.min(idx, filtered.length - 1) : 0,
    );
  }, [filtered.length]);

  const handleKeyDownList = (e: React.KeyboardEvent) => {
    if (!filtered.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % filtered.length);
      scrollIntoView(activeIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
      scrollIntoView(activeIndex - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[activeIndex];
      if (item && !item.disabled) onAdd(item.type);
    } else if (e.key === "Escape") {
      setQuery("");
      inputRef.current?.focus();
    }
  };

  const scrollIntoView = (idx: number) => {
    const parent = listRef.current;
    if (!parent) return;
    const el =
      parent.querySelectorAll<HTMLButtonElement>('[role="option"]')[
        ((idx % filtered.length) + filtered.length) % filtered.length
      ];
    el?.scrollIntoView({ block: "nearest" });
  };

  const setDragImage = useCallback(
    (
      e: React.DragEvent | PointerEvent | MouseEvent | TouchEvent,
      label: string,
    ) => {
      // Crea una drag image minimalista
      const canvas = document.createElement("canvas");
    const paddingX = 14;
    const paddingY = 8;
    const font = "12px ui-sans-serif, system-ui, -apple-system";
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(label).width) + paddingX * 2;
    const h = 28 + paddingY * 2;
    canvas.width = w;
    canvas.height = h;

    // Fondo
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#cbd5e1"; // slate-300
    ctx.lineWidth = 1;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

    // Texto
    ctx.fillStyle = "#0f172a"; // slate-900
    ctx.font = font;
    ctx.fillText(label, paddingX, h / 2 + 4);
    if ("dataTransfer" in e && e.dataTransfer) {
      e.dataTransfer.setDragImage(canvas, w / 2, h / 2);
    }
  }, []);

  const handleDragStart = useCallback(
    (event: unknown, item: PaletteItem) => {
      if (
        !event ||
        typeof event !== "object" ||
        !("dataTransfer" in event)
      ) {
        return;
      }

      const dragEvent = event as React.DragEvent<HTMLButtonElement>;
      const transfer = dragEvent.dataTransfer;
      if (transfer) {
        transfer.setData("application/wa-node", item.type);
        transfer.effectAllowed = "move";
      }

      setDragImage(dragEvent, item.label);
    },
    [setDragImage],
  );

  return (
    <div className={`space-y-5 ${className}`}>
      {/* Search */}
      <div
        className="relative flex items-center rounded-2xl border border-white/60 bg-white/80 px-4 shadow-inner backdrop-blur"
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label="Buscar nodos"
          role="searchbox"
          className="h-11 flex-1 border-none bg-transparent pr-16 text-sm shadow-none focus-visible:ring-0 focus-visible:outline-none"
        />
        {/* Icon left */}
        <Search className="pointer-events-none absolute right-11 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        {/* Clear */}
        {query ? (
          <button
            aria-label="Limpiar búsqueda"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-200/60 p-1 text-slate-500 transition hover:bg-slate-300/70"
            onClick={() => setQuery("")}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* List */}
      <div
        ref={listRef}
        className="grid grid-cols-1 gap-3 outline-none"
        role="listbox"
        aria-label="Paleta de nodos"
        tabIndex={0}
        onKeyDown={handleKeyDownList}
      >
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200/70 bg-white/70 p-4 text-sm text-muted-foreground shadow-inner">
            Sin resultados para <span className="font-medium">“{query}”</span>.
            Probá con
            <span className="ml-1">“mensaje”</span>, <span>“opciones”</span>,{" "}
            <span>“api”</span>…
          </div>
        )}

        {filtered.map((p, idx) => {
          const isActive = idx === activeIndex;
          const Icon = p.icon;

          return (
            <motion.button
              key={p.type}
              type="button"
              role="option"
              aria-selected={isActive}
              disabled={p.disabled}
              onClick={() => !p.disabled && onAdd(p.type)}
              onDragStart={(event) => handleDragStart(event, p)}
              draggable
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={[
                "group flex items-center gap-3 rounded-2xl border border-white/60 bg-white/80 p-3 text-left shadow-[0_18px_40px_-30px_rgba(15,23,42,0.55)] transition-all duration-200",
                "hover:-translate-y-0.5 hover:shadow-[0_28px_55px_-35px_rgba(14,165,233,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/80",
                isActive
                  ? "ring-2 ring-sky-300/80 shadow-[0_32px_70px_-40px_rgba(14,165,233,0.6)]"
                  : "",
                p.disabled ? "cursor-not-allowed opacity-50" : "",
              ].join(" ")}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-sky-100/90 via-white to-emerald-100/70 text-sky-600 shadow-inner">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-700">
                  {highlightMatch(p.label, debouncedQ)}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {highlightMatch(p.hint, debouncedQ)}
                </div>
              </div>

              {/* Tipo como badge sutil (útil cuando los labels se parecen) */}
              <span className="ml-auto rounded-full border border-slate-200/70 bg-slate-100/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                {p.type}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
