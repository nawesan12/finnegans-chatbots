"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import { MessageSquare, Users, ArrowRight, Bot } from "lucide-react";
import { containerVariants, itemVariants } from "@/lib/animations";
import MetricCard from "@/components/dashboard/MetricCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store";

type DashboardMetrics = {
  totalContacts: number;
  activeConversations: number;
  messagesSent: number;
  flowSuccessRate: number;
};

type RecentLog = {
  id: string;
  createdAt: string;
  contact: { name: string | null; phone: string } | null;
  flow: { name: string | null } | null;
};

type MessageVolumePoint = {
  date: string;
  sent: number;
  received: number;
};

type FlowFilterOption = {
  id: string;
  name: string;
  channel: string | null;
};

const dateRangeOptions = [
  { value: "7", label: "Últimos 7 días" },
  { value: "14", label: "Últimos 14 días" },
  { value: "30", label: "Últimos 30 días" },
  { value: "90", label: "Últimos 90 días" },
];

const parseErrorMessage = async (response: Response, fallback: string) => {
  try {
    const data = await response.json();
    if (typeof data?.error === "string") {
      return data.error;
    }
  } catch (error) {
    console.error("Failed to parse error response", error);
  }
  return fallback;
};

const DashboardPage = () => {
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageVolumeData, setMessageVolumeData] = useState<MessageVolumePoint[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<string>(dateRangeOptions[0].value);
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [selectedFlow, setSelectedFlow] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [availableFlows, setAvailableFlows] = useState<FlowFilterOption[]>([]);
  const [availableChannels, setAvailableChannels] = useState<string[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat("es-AR", {
        maximumFractionDigits: 0,
      }),
    [],
  );

  const percentageFormatter = useMemo(
    () =>
      new Intl.NumberFormat("es-AR", {
        maximumFractionDigits: 1,
      }),
    [],
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "short",
      }),
    [],
  );

  const formattedChartData = useMemo(
    () =>
      messageVolumeData.map((point) => ({
        name: dateFormatter.format(new Date(point.date)),
        sent: point.sent,
        received: point.received,
      })),
    [dateFormatter, messageVolumeData],
  );

  const chartHasData = useMemo(
    () => formattedChartData.some((point) => point.sent > 0 || point.received > 0),
    [formattedChartData],
  );

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!token) {
      setMetrics(null);
      setRecentLogs([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const authHeaders = {
          Authorization: `Bearer ${token}`,
        } as const;

        const [metricsRes, logsRes] = await Promise.all([
          fetch("/api/metrics", { headers: authHeaders }),
          fetch("/api/logs?limit=4", { headers: authHeaders }),
        ]);

        if (!metricsRes.ok) {
          throw new Error(
            await parseErrorMessage(
              metricsRes,
              "No se pudieron obtener las métricas del panel",
            ),
          );
        }

        if (!logsRes.ok) {
          throw new Error(
            await parseErrorMessage(
              logsRes,
              "No se pudo obtener la actividad reciente",
            ),
          );
        }

        const metricsData: DashboardMetrics = await metricsRes.json();
        const logsData: RecentLog[] = await logsRes.json();

        if (!isMounted) {
          return;
        }

        setMetrics(metricsData);
        setRecentLogs(logsData);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Error al cargar la información del panel";
        toast.error(message);
        if (isMounted) {
          setMetrics(null);
          setRecentLogs([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [hasHydrated, token]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!token) {
      setMessageVolumeData([]);
      setAvailableFlows([]);
      setAvailableChannels([]);
      setAvailableStatuses([]);
      setChartError(null);
      setChartLoading(false);
      return;
    }

    let isMounted = true;

    const fetchChartData = async () => {
      try {
        setChartLoading(true);
        setChartError(null);

        const params = new URLSearchParams({ range: selectedRange });
        if (selectedChannel !== "all") {
          params.set("channel", selectedChannel);
        }
        if (selectedFlow !== "all") {
          params.set("flowId", selectedFlow);
        }
        if (selectedStatus !== "all") {
          params.set("status", selectedStatus);
        }

        const response = await fetch(
          `/api/metrics/messages-volume?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(
            await parseErrorMessage(
              response,
              "No se pudo obtener el volumen de mensajes",
            ),
          );
        }

        const data: {
          data: MessageVolumePoint[];
          filters: {
            flows: FlowFilterOption[];
            channels: string[];
            statuses: string[];
          };
        } = await response.json();

        if (!isMounted) {
          return;
        }

        setMessageVolumeData(data.data);
        setAvailableFlows(data.filters.flows);
        setAvailableChannels(data.filters.channels);
        setAvailableStatuses(data.filters.statuses);

        if (
          selectedFlow !== "all" &&
          !data.filters.flows.some((flow) => flow.id === selectedFlow)
        ) {
          setSelectedFlow("all");
        }

        if (
          selectedChannel !== "all" &&
          !data.filters.channels.includes(selectedChannel)
        ) {
          setSelectedChannel("all");
        }

        if (
          selectedStatus !== "all" &&
          !data.filters.statuses.includes(selectedStatus)
        ) {
          setSelectedStatus("all");
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Error al cargar el volumen de mensajes";
        if (isMounted) {
          setChartError(message);
          setMessageVolumeData([]);
        }
        toast.error(message);
      } finally {
        if (isMounted) {
          setChartLoading(false);
        }
      }
    };

    fetchChartData();

    return () => {
      isMounted = false;
    };
  }, [
    hasHydrated,
    selectedChannel,
    selectedFlow,
    selectedRange,
    selectedStatus,
    token,
  ]);

  const metricCards = useMemo(() => {
    const data: DashboardMetrics = metrics ?? {
      totalContacts: 0,
      activeConversations: 0,
      messagesSent: 0,
      flowSuccessRate: 0,
    };

    return [
      {
        title: "Contactos Totales",
        value: numberFormatter.format(data.totalContacts),
        change: "+5% este mes",
        icon: Users,
      },
      {
        title: "Conversaciones Activas",
        value: numberFormatter.format(data.activeConversations),
        change: "-2% hoy",
        icon: MessageSquare,
      },
      {
        title: "Mensajes Enviados",
        value: numberFormatter.format(data.messagesSent),
        change: "+12% esta semana",
        icon: ArrowRight,
      },
      {
        title: "Ratio de Exito",
        value: `${percentageFormatter.format(data.flowSuccessRate)}%`,
        change: "+1.2% este mes",
        icon: Bot,
      },
    ];
  }, [metrics, numberFormatter, percentageFormatter]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`dashboard-metric-skeleton-${index}`}
              className="rounded-lg bg-white p-6 shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-lg bg-white p-6 shadow-md">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-[260px] w-full" />
          </div>
          <div className="space-y-4 rounded-lg bg-white p-6 shadow-md">
            <Skeleton className="h-5 w-48" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`dashboard-log-skeleton-${index}`}
                  className="flex items-center justify-between"
                >
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {metricCards.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </motion.div>
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
      <motion.div
        variants={itemVariants}
        className="bg-white p-6 rounded-lg shadow-md"
      >
        <div className="flex flex-col gap-4 mb-4 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="font-semibold text-gray-800">
            Volumen de Mensajes
          </h3>
          <div className="flex flex-wrap gap-3">
            <Select value={selectedRange} onValueChange={setSelectedRange}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Rango de fechas" />
              </SelectTrigger>
              <SelectContent>
                {dateRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedChannel}
              onValueChange={setSelectedChannel}
              disabled={!availableChannels.length}
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Canal" />
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
            <Select
              value={selectedFlow}
              onValueChange={setSelectedFlow}
              disabled={!availableFlows.length}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Flujo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los flujos</SelectItem>
                {availableFlows.map((flow) => (
                  <SelectItem key={flow.id} value={flow.id}>
                    {flow.name}
                    {flow.channel ? ` · ${flow.channel}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedStatus}
              onValueChange={setSelectedStatus}
              disabled={!availableStatuses.length}
            >
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Estado" />
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
          </div>
        </div>
        <div className="h-[300px]">
          {chartLoading ? (
            <Skeleton className="h-full w-full" />
          ) : chartError ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-red-500 text-center max-w-sm">
                {chartError}
              </p>
            </div>
          ) : chartHasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 12 }} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "14px" }} />
                <Bar
                  dataKey="sent"
                  fill="#04102D"
                  name="Enviados"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="received"
                  fill="#4bc3fe"
                  name="Recibidos"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-gray-500 text-center max-w-sm">
                No hay datos disponibles para los filtros seleccionados.
              </p>
            </div>
          )}
        </div>
      </motion.div>
        <motion.div
          variants={itemVariants}
          className="bg-white p-6 rounded-lg shadow-md"
        >
          <h3 className="font-semibold text-gray-800 mb-4">
            Actividad Reciente
          </h3>
          <ul className="space-y-4">
            {recentLogs.map((log) => {
              const contactNameValue = log.contact?.name?.trim();
              const contactDisplayName =
                contactNameValue && contactNameValue.length > 0
                  ? contactNameValue
                  : (log.contact?.phone ?? "Contacto sin nombre");

              const flowNameValue = log.flow?.name?.trim();
              const flowDisplayName =
                flowNameValue && flowNameValue.length > 0
                  ? flowNameValue
                  : "Flujo sin nombre";

              const timestamp = log.createdAt
                ? new Date(log.createdAt).toLocaleTimeString()
                : "--";

              return (
                <li key={log.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-700">
                      {contactDisplayName}
                    </p>
                    <p className="text-sm text-gray-500">{flowDisplayName}</p>
                  </div>
                  <span className="text-sm text-gray-400">{timestamp}</span>
                </li>
              );
            })}
          </ul>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default DashboardPage;
