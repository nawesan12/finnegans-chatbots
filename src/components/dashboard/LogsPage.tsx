"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

import PageHeader from "@/components/dashboard/PageHeader";
import Table from "@/components/dashboard/Table";
import { itemVariants } from "@/lib/animations";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store";

interface LogEntry {
  id: string;
  contact?: { name?: string | null; phone: string } | null;
  flow?: { name?: string | null } | null;
  createdAt: string;
  status?: string | null;
  direction?: string | null;
  channel?: string | null;
  message?: string | null;
  error?: string | null;
}

const statusBadgeVariants: Record<
  string,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  Completed: "default",
  Delivered: "default",
  Sent: "default",
  Read: "default",
  Processing: "secondary",
  Pending: "secondary",
  "In Progress": "secondary",
  Queued: "secondary",
  Warning: "secondary",
  Failed: "destructive",
  Error: "destructive",
  CompletedWithErrors: "destructive",
};

const LogsPage = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat("es-AR", {
        maximumFractionDigits: 0,
      }),
    [],
  );

  const fetchLogs = useCallback(async () => {
    if (!token) {
      setLogs([]);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/logs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("No se pudieron obtener los registros de actividad");
      }
      const data: LogEntry[] = await response.json();
      setLogs(data);
    } catch (error) {
      toast.error((error as Error)?.message ?? "Error al obtener registros");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    void fetchLogs();
  }, [fetchLogs, hasHydrated]);

  const availableStatuses = useMemo(() => {
    const entries = new Set<string>();
    logs.forEach((log) => {
      if (log.status) {
        entries.add(log.status);
      }
    });
    return Array.from(entries).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" }),
    );
  }, [logs]);

  const availableChannels = useMemo(() => {
    const entries = new Set<string>();
    logs.forEach((log) => {
      if (log.channel) {
        entries.add(log.channel);
      }
    });
    return Array.from(entries).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" }),
    );
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesStatus =
        statusFilter === "all" ||
        (log.status ?? "").toString() === statusFilter;
      const matchesChannel =
        channelFilter === "all" || (log.channel ?? "") === channelFilter;

      if (!matchesStatus || !matchesChannel) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const contactName = log.contact?.name?.toLowerCase() ?? "";
      const contactPhone = log.contact?.phone?.toLowerCase() ?? "";
      const flowName = log.flow?.name?.toLowerCase() ?? "";
      const message = log.message?.toLowerCase() ?? "";
      const status = log.status?.toLowerCase() ?? "";
      const channel = log.channel?.toLowerCase() ?? "";

      return [
        contactName,
        contactPhone,
        flowName,
        message,
        status,
        channel,
      ].some((value) => value.includes(normalizedSearch));
    });
  }, [channelFilter, logs, searchTerm, statusFilter]);

  const hasActiveFilters =
    statusFilter !== "all" || channelFilter !== "all" || searchTerm.trim();

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setChannelFilter("all");
  };

  const columns = [
    {
      key: "contact",
      label: "Contacto",
      render: (row: LogEntry) => {
        const name = row.contact?.name?.trim();
        const phone = row.contact?.phone;
        if (!name && !phone) {
          return <span className="text-gray-400">Sin datos</span>;
        }
        return (
          <div className="space-y-0.5">
            <p className="font-medium text-gray-900">{name || phone}</p>
            {name && phone ? (
              <p className="text-xs text-gray-500">{phone}</p>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "flow",
      label: "Flujo asociado",
      render: (row: LogEntry) => (
        <span className="text-gray-700">{row.flow?.name ?? "Sin flujo"}</span>
      ),
    },
    {
      key: "channel",
      label: "Canal",
      render: (row: LogEntry) => (
        <span className="uppercase tracking-wide text-xs text-gray-500">
          {row.channel ?? "--"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Estado",
      render: (row: LogEntry) => {
        const status = row.status ?? "Desconocido";
        const badgeVariant = statusBadgeVariants[status] ?? "outline";
        return <Badge variant={badgeVariant}>{status}</Badge>;
      },
    },
    {
      key: "createdAt",
      label: "Registrado",
      align: "right" as const,
      render: (row: LogEntry) => (
        <span className="text-gray-500">
          {new Date(row.createdAt).toLocaleString("es-AR", {
            dateStyle: "short",
            timeStyle: "short",
          })}
        </span>
      ),
    },
  ];

  const emptyStateTitle = hasActiveFilters
    ? "No se encontraron registros"
    : "Aún no hay actividad";

  const emptyStateDescription = hasActiveFilters
    ? "Prueba ajustando la búsqueda o restablece los filtros para revisar todos los registros disponibles."
    : "Cuando tus contactos interactúen con tus flujos verás aquí el detalle de cada mensaje enviado y recibido.";

  const summaryText = `Mostrando ${numberFormatter.format(
    filteredLogs.length,
  )} de ${numberFormatter.format(logs.length)} registros`;

  const isInitialLoading = loading && !logs.length;

  if (isInitialLoading) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader
          title="Registros"
          description="Audita en tiempo real los mensajes que intercambias con tus contactos y detecta incidencias rápidamente."
        />
        <motion.div
          variants={itemVariants}
          className="overflow-hidden rounded-lg bg-white shadow-md"
        >
          <div className="space-y-2 border-b border-gray-100 p-6">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={`logs-loading-header-${String(column.key)}`}
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Array.from({ length: 6 }).map((_, rowIndex) => (
                  <tr key={`logs-loading-row-${rowIndex}`}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-44" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <Skeleton className="h-4 w-28" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Registros"
        description="Audita en tiempo real los mensajes que intercambias con tus contactos y detecta incidencias rápidamente."
      />
      <motion.div
        variants={itemVariants}
        className="rounded-lg bg-white shadow-md"
      >
        <div className="space-y-4 border-b border-gray-100 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por contacto, flujo, estado o canal"
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full max-w-[200px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {availableStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger className="w-full max-w-[200px]">
                  <SelectValue placeholder="Filtrar por canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los canales</SelectItem>
                  {availableChannels.map((channel) => (
                    <SelectItem key={channel} value={channel}>
                      {channel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span>{summaryText}</span>
              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                >
                  Restablecer filtros
                </Button>
              ) : null}
              {loading ? (
                <span className="flex items-center gap-2 text-gray-400">
                  <span className="h-2 w-2 animate-ping rounded-full bg-[#8694ff]" />
                  Actualizando registros...
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <Table //@ts-expect-error bla
          columns={columns} //@ts-expect-error bla
          data={filteredLogs}
          emptyState={{
            title: emptyStateTitle,
            description: emptyStateDescription,
            action: hasActiveFilters ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleClearFilters}
              >
                Quitar filtros
              </Button>
            ) : undefined,
          }}
          className="rounded-b-lg"
        />
      </motion.div>
    </div>
  );
};

export default LogsPage;
