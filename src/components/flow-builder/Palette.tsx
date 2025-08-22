import React, { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
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
} from "lucide-react";

const palette = [
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

export function Palette({ onAdd }) {
    const [query, setQuery] = useState("");
    const items = palette.filter((p) =>
        p.label.toLowerCase().includes(query.toLowerCase()),
    );
    return (
        <div className="space-y-3">
            <div className="relative">
                <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar nodos"
                />
                <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
            <div className="grid grid-cols-1 gap-2">
                {items.map((p) => (
                    <motion.button
                        key={p.type}
                        onClick={() => onAdd(p.type)}
                        whileHover={{ scale: 1.02 }}
                        className="flex items-center gap-3 p-3 rounded-2xl border hover:shadow-sm text-left"
                    >
                        <p.icon className="h-5 w-5" />
                        <div>
                            <div className="font-medium">{p.label}</div>
                            <div className="text-xs text-muted-foreground">{p.hint}</div>
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
export const paletteItems = palette;
