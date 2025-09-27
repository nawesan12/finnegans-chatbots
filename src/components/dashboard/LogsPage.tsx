"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Clock3,
  MessageSquare,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";

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
import MetricCard from "@/components/dashboard/MetricCard";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

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
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
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
      setLastUpdated(new Date());
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

  const successStatuses = useMemo(
    () =>
      new Set([
        "completed",
        "delivered",
        "sent",
        "read",
      ]),
    [],
  );

  const pendingStatuses = useMemo(
    () =>
      new Set([
        "processing",
        "pending",
        "in progress",
        "queued",
        "warning",
      ]),
    [],
  );

  const failedStatuses = useMemo(
    () =>
      new Set([
        "failed",
        "error",
        "completedwitherrors",
      ]),
    [],
  );

  const aggregatedMetrics = useMemo(() => {
    const uniqueContacts = new Set<string>();
    let successful = 0;
    let failed = 0;
    let pending = 0;
    let inbound = 0;
    let outbound = 0;
    let undefinedDirection = 0;

    logs.forEach((log) => {
      if (log.contact?.phone) {
        uniqueContacts.add(log.contact.phone);
      }

      const normalizedStatus = log.status?.toLowerCase() ?? "";
      if (successStatuses.has(normalizedStatus)) {
        successful += 1;
      } else if (failedStatuses.has(normalizedStatus)) {
        failed += 1;
      } else if (pendingStatuses.has(normalizedStatus)) {
        pending += 1;
      }

      const rawDirection = log.direction ?? "";
      const normalizedDirection = rawDirection.toLowerCase().trim();
      if (!normalizedDirection) {
        undefinedDirection += 1;
        return;
      }

      if (
        ["inbound", "incoming", "entrada", "entrante", "received"].some((term) =>
          normalizedDirection.includes(term),
        )
      ) {
        inbound += 1;
        return;
      }

      if (
        ["outbound", "outgoing", "saliente", "envio", "sent"].some((term) =>
          normalizedDirection.includes(term),
        )
      ) {
        outbound += 1;
        return;
      }

      undefinedDirection += 1;
    });

    const total = logs.length;
    const successRate = total ? Math.round((successful / total) * 100) : 0;

    return {
      total,
      successful,
      failed,
      pending,
      successRate,
      uniqueContacts: uniqueContacts.size,
      inbound,
      outbound,
      undefinedDirection,
    };
  }, [failedStatuses, logs, pendingStatuses, successStatuses]);

  const formattedSuccessRate = aggregatedMetrics.total
    ? `${aggregatedMetrics.successRate}%`
    : "—";

  const totalDirections =
    aggregatedMetrics.inbound +
    aggregatedMetrics.outbound +
    aggregatedMetrics.undefinedDirection;

  const formatDirectionLabel = (direction?: string | null) => {
    const rawDirection = direction ?? "";
    const normalizedDirection = rawDirection.toLowerCase().trim();
    if (!normalizedDirection) {
      return "Sin clasificar";
    }

    if (
      ["inbound", "incoming", "entrada", "entrante", "received"].some((term) =>
        normalizedDirection.includes(term),
      )
    ) {
      return "Entrante";
    }

    if (
      ["outbound", "outgoing", "saliente", "envio", "sent"].some((term) =>
        normalizedDirection.includes(term),
      )
    ) {
      return "Saliente";
    }

    return direction ?? "Sin clasificar";
  };

  const handleViewDetails = (log: LogEntry) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  const handleDetailOpenChange = (open: boolean) => {
    setIsDetailOpen(open);
    if (!open) {
      setSelectedLog(null);
    }
  };

  const handleCopyMessage = async () => {
    if (!selectedLog?.message) {
      return;
    }

    if (!navigator?.clipboard) {
      toast.error("La función de copiado no está disponible en este navegador.");
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedLog.message);
      toast.success("Mensaje copiado al portapapeles");
    } catch (error) {
      toast.error(
        (error as Error)?.message ?? "No pudimos copiar el mensaje, inténtalo otra vez.",
      );
    }
  };

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) {
      return "Sincronizando";
    }

    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(lastUpdated);
  }, [lastUpdated]);

  const handleRefresh = () => {
    void fetchLogs();
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
      key: "direction",
      label: "Dirección",
      render: (row: LogEntry) => {
        const label = formatDirectionLabel(row.direction);
        return (
          <Badge
            variant="outline"
            className={cn(
              "border-gray-200 bg-gray-50 text-gray-600",
              label === "Entrante" &&
                "border-emerald-200 bg-emerald-50 text-emerald-700",
              label === "Saliente" &&
                "border-indigo-200 bg-indigo-50 text-indigo-700",
            )}
          >
            {label}
          </Badge>
        );
      },
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
    {
      key: "message",
      label: "Detalle",
      className: "whitespace-normal",
      render: (row: LogEntry) => (
        <div className="max-w-xs space-y-1 text-sm text-gray-600">
          <p className="font-medium text-gray-700">
            {row.message ? row.message : "Sin mensaje registrado"}
          </p>
          {row.error ? (
            <p className="text-xs text-red-500">Error: {row.error}</p>
          ) : null}
          {(row.message && row.message.length > 0) || row.error ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto px-0 text-indigo-600"
              onClick={() => handleViewDetails(row)}
            >
              Ver detalle completo
            </Button>
          ) : null}
        </div>
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
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          title="Total de registros"
          value={numberFormatter.format(aggregatedMetrics.total)}
          icon={MessageSquare}
        />
        <MetricCard
          title="Tasa de éxito"
          value={formattedSuccessRate}
          change={
            aggregatedMetrics.total
              ? `${numberFormatter.format(aggregatedMetrics.successful)} mensajes entregados`
              : undefined
          }
          icon={RefreshCw}
        />
        <MetricCard
          title="En seguimiento"
          value={numberFormatter.format(aggregatedMetrics.pending)}
          icon={Clock3}
        />
        <MetricCard
          title="Errores detectados"
          value={numberFormatter.format(aggregatedMetrics.failed)}
          icon={AlertTriangle}
        />
      </motion.div>
      <motion.div
        variants={itemVariants}
        className="grid gap-4 lg:grid-cols-3"
      >
        <div className="rounded-lg bg-white p-6 shadow-md lg:col-span-2">
          <p className="text-sm font-medium text-gray-500">Dirección de los mensajes</p>
          <div className="mt-4 space-y-4">
            {["Entrantes", "Salientes", "Sin clasificar"].map((label) => {
              const count =
                label === "Entrantes"
                  ? aggregatedMetrics.inbound
                  : label === "Salientes"
                    ? aggregatedMetrics.outbound
                    : aggregatedMetrics.undefinedDirection;
              if (!count) {
                return null;
              }

              const color =
                label === "Entrantes"
                  ? "bg-emerald-500"
                  : label === "Salientes"
                    ? "bg-indigo-500"
                    : "bg-gray-400";

              return (
                <div key={label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", color)} />
                      {label}
                    </span>
                    <span className="font-medium text-gray-900">
                      {numberFormatter.format(count)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={cn("h-full rounded-full", color)}
                      style={{
                        width: `${
                          totalDirections
                            ? Math.round((count / totalDirections) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {!totalDirections ? (
              <p className="text-sm text-gray-500">
                Aún no podemos clasificar la dirección de los mensajes recibidos.
              </p>
            ) : null}
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-md">
          <p className="text-sm font-medium text-gray-500">Contactos únicos</p>
          <p className="mt-3 text-3xl font-semibold text-gray-900">
            {numberFormatter.format(aggregatedMetrics.uniqueContacts)}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Representan a los contactos con los que intercambiaste mensajes en el período visualizado.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
            <Users className="h-4 w-4" />
            <span>Última actualización: {lastUpdatedLabel}</span>
          </div>
        </div>
      </motion.div>
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
                className="text-indigo-600 hover:text-indigo-700"
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Actualizar
              </Button>
              {!loading ? (
                <span className="flex items-center gap-2 text-gray-400">
                  <RefreshCw className="h-3 w-3" />
                  {lastUpdatedLabel}
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
      <Dialog open={isDetailOpen} onOpenChange={handleDetailOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle del registro</DialogTitle>
            <DialogDescription>
              Revisa la información completa intercambiada con el contacto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-gray-600">
            <div>
              <p className="text-xs uppercase text-gray-400">Contacto</p>
              <p className="font-medium text-gray-900">
                {selectedLog?.contact?.name ?? selectedLog?.contact?.phone ?? "Sin datos"}
              </p>
              {selectedLog?.contact?.name && selectedLog?.contact?.phone ? (
                <p className="text-xs text-gray-500">{selectedLog.contact.phone}</p>
              ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-gray-400">Estado</p>
                <p className="font-medium text-gray-900">
                  {selectedLog?.status ?? "Desconocido"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-400">Canal</p>
                <p className="font-medium text-gray-900">
                  {selectedLog?.channel ?? "--"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-400">Dirección</p>
                <p className="font-medium text-gray-900">
                  {formatDirectionLabel(selectedLog?.direction)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-400">Registrado</p>
                <p className="font-medium text-gray-900">
                  {selectedLog
                    ? new Date(selectedLog.createdAt).toLocaleString("es-AR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })
                    : "--"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-400">Mensaje</p>
              <div className="mt-1 rounded-lg border border-gray-100 bg-gray-50 p-3 text-gray-700">
                {selectedLog?.message ?? "Sin mensaje disponible"}
              </div>
            </div>
            {selectedLog?.error ? (
              <div>
                <p className="text-xs uppercase text-gray-400">Detalle del error</p>
                <div className="mt-1 rounded-lg border border-red-100 bg-red-50 p-3 text-red-700">
                  {selectedLog.error}
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            {selectedLog?.message ? (
              <Button type="button" variant="outline" onClick={() => void handleCopyMessage()}>
                Copiar mensaje
              </Button>
            ) : null}
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cerrar
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LogsPage;
