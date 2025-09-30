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
import FilterMultiSelect from "@/components/dashboard/FilterMultiSelect";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { authenticatedFetch } from "@/lib/api-client";
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

type ChannelDistributionPoint = {
  channel: string;
  sent: number;
  received: number;
  total: number;
};

type FlowPerformancePoint = {
  flowId: string;
  flowName: string;
  total: number;
  completed: number;
  errored: number;
  successRate: number;
};

type StatusBreakdownPoint = {
  status: string;
  count: number;
};

type DashboardInsights = {
  channelDistribution: ChannelDistributionPoint[];
  flowPerformance: FlowPerformancePoint[];
  statusBreakdown: StatusBreakdownPoint[];
};

type StatusBreakdownWithPercentage = StatusBreakdownPoint & {
  percentage: number;
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
  const [messageVolumeData, setMessageVolumeData] = useState<
    MessageVolumePoint[]
  >([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<string>(
    dateRangeOptions[0].value,
  );
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedFlows, setSelectedFlows] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [availableFlows, setAvailableFlows] = useState<FlowFilterOption[]>([]);
  const [availableChannels, setAvailableChannels] = useState<string[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [insights, setInsights] = useState<DashboardInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState<string | null>(null);

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
    () =>
      formattedChartData.some((point) => point.sent > 0 || point.received > 0),
    [formattedChartData],
  );

  const channelOptions = useMemo(
    () =>
      availableChannels.map((channel) => ({
        value: channel,
        label: channel,
      })),
    [availableChannels],
  );

  const flowOptions = useMemo(
    () =>
      availableFlows.map((flow) => ({
        value: flow.id,
        label: flow.name,
        description: flow.channel ? `Canal: ${flow.channel}` : undefined,
      })),
    [availableFlows],
  );

  const statusOptions = useMemo(
    () =>
      availableStatuses.map((status) => ({
        value: status,
        label: status,
      })),
    [availableStatuses],
  );

  const statusBreakdownWithPercentage: StatusBreakdownWithPercentage[] =
    useMemo(() => {
      if (!insights?.statusBreakdown?.length) {
        return [];
      }

      const total = insights.statusBreakdown.reduce(
        (sum, entry) => sum + entry.count,
        0,
      );

      if (total === 0) {
        return insights.statusBreakdown.map((entry) => ({
          ...entry,
          percentage: 0,
        }));
      }

      return insights.statusBreakdown
        .map((entry) => ({
          ...entry,
          percentage: Number(((entry.count / total) * 100).toFixed(1)),
        }))
        .sort((a, b) => b.count - a.count);
    }, [insights]);

  const channelDistributionData = insights?.channelDistribution ?? [];
  const flowPerformanceData = insights?.flowPerformance ?? [];
  const hasChannelDistributionData = channelDistributionData.some(
    (entry) => entry.total > 0,
  );
  const hasFlowPerformanceData = flowPerformanceData.some(
    (entry) => entry.total > 0,
  );
  const hasStatusBreakdownData = statusBreakdownWithPercentage.some(
    (entry) => entry.count > 0,
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
        const [metricsRes, logsRes] = await Promise.all([
          authenticatedFetch("/api/metrics"),
          authenticatedFetch("/api/logs?limit=4"),
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
      setInsights(null);
      setInsightsError(null);
      return;
    }

    let isMounted = true;

    const fetchChartData = async () => {
      try {
        setChartLoading(true);
        setChartError(null);

        const params = new URLSearchParams({ range: selectedRange });
        if (selectedChannels.length) {
          params.set("channel", selectedChannels.join(","));
        }
        if (selectedFlows.length) {
          params.set("flowId", selectedFlows.join(","));
        }
        if (selectedStatuses.length) {
          params.set("status", selectedStatuses.join(","));
        }

        const response = await authenticatedFetch(
          `/api/metrics/messages-volume?${params.toString()}`,
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

        setSelectedFlows((previous) => {
          if (!previous.length) {
            return previous;
          }
          const validIds = new Set(data.filters.flows.map((flow) => flow.id));
          const filtered = previous.filter((flowId) => validIds.has(flowId));
          return filtered.length === previous.length ? previous : filtered;
        });

        setSelectedChannels((previous) => {
          if (!previous.length) {
            return previous;
          }
          const validChannels = new Set(data.filters.channels);
          const filtered = previous.filter((channel) =>
            validChannels.has(channel),
          );
          return filtered.length === previous.length ? previous : filtered;
        });

        setSelectedStatuses((previous) => {
          if (!previous.length) {
            return previous;
          }
          const validStatuses = new Set(data.filters.statuses);
          const filtered = previous.filter((status) =>
            validStatuses.has(status),
          );
          return filtered.length === previous.length ? previous : filtered;
        });
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
    selectedChannels,
    selectedFlows,
    selectedRange,
    selectedStatuses,
    token,
  ]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!token) {
      setInsights(null);
      setInsightsError(null);
      setInsightsLoading(false);
      return;
    }

    let isMounted = true;

    const fetchInsights = async () => {
      try {
        setInsightsLoading(true);
        setInsightsError(null);

        const params = new URLSearchParams({ range: selectedRange });
        if (selectedChannels.length) {
          params.set("channel", selectedChannels.join(","));
        }
        if (selectedFlows.length) {
          params.set("flowId", selectedFlows.join(","));
        }
        if (selectedStatuses.length) {
          params.set("status", selectedStatuses.join(","));
        }

        const response = await authenticatedFetch(
          `/api/metrics/dashboard-insights?${params.toString()}`,
        );

        if (!response.ok) {
          throw new Error(
            await parseErrorMessage(
              response,
              "No se pudieron obtener los insights del panel",
            ),
          );
        }

        const payload: DashboardInsights = await response.json();

        if (!isMounted) {
          return;
        }

        setInsights(payload);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Error al cargar los insights del panel";
        if (isMounted) {
          setInsightsError(message);
          setInsights(null);
        }
        toast.error(message);
      } finally {
        if (isMounted) {
          setInsightsLoading(false);
        }
      }
    };

    fetchInsights();

    return () => {
      isMounted = false;
    };
  }, [
    hasHydrated,
    selectedChannels,
    selectedFlows,
    selectedRange,
    selectedStatuses,
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
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {metricCards.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </motion.div>
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={itemVariants}
          className="rounded-lg bg-white p-5 shadow-md"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="font-semibold text-gray-800">Filtros del panel</h3>
              <p className="text-sm text-gray-500">
                Ajusta los filtros para actualizar todos los gráficos en tiempo
                real.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Select value={selectedRange} onValueChange={setSelectedRange}>
                <SelectTrigger className="w-[180px]">
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
              <FilterMultiSelect
                label="Canales"
                options={channelOptions}
                selectedValues={selectedChannels}
                onSelectionChange={setSelectedChannels}
                disabled={!channelOptions.length}
                className="min-w-[160px]"
              />
              <FilterMultiSelect
                label="Flujos"
                options={flowOptions}
                selectedValues={selectedFlows}
                onSelectionChange={setSelectedFlows}
                disabled={!flowOptions.length}
                className="min-w-[220px]"
              />
              <FilterMultiSelect
                label="Estados"
                options={statusOptions}
                selectedValues={selectedStatuses}
                onSelectionChange={setSelectedStatuses}
                disabled={!statusOptions.length}
                className="min-w-[180px]"
              />
            </div>
          </div>
        </motion.div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <motion.div
            variants={itemVariants}
            className="rounded-lg bg-white p-6 shadow-md xl:col-span-2"
          >
            <div className="mb-4 space-y-2">
              <h3 className="font-semibold text-gray-800">
                Volumen de Mensajes
              </h3>
              <p className="text-sm text-gray-500">
                Analiza la evolución de mensajes enviados y recibidos en el
                periodo seleccionado.
              </p>
            </div>
            <div className="h-[300px]">
              {chartLoading ? (
                <Skeleton className="h-full w-full" />
              ) : chartError ? (
                <div className="flex h-full items-center justify-center">
                  <p className="max-w-sm text-center text-sm text-red-500">
                    {chartError}
                  </p>
                </div>
              ) : chartHasData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={formattedChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#6b7280", fontSize: 12 }}
                    />
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
                  <p className="max-w-sm text-center text-sm text-gray-500">
                    No hay datos disponibles para los filtros seleccionados.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
          <motion.div
            variants={itemVariants}
            className="rounded-lg bg-white p-6 shadow-md"
          >
            <div className="mb-4 space-y-2">
              <h3 className="font-semibold text-gray-800">
                Distribución por Canal
              </h3>
              <p className="text-sm text-gray-500">
                Observa la proporción de mensajes enviados y recibidos por
                canal.
              </p>
            </div>
            <div className="h-[300px]">
              {insightsLoading ? (
                <Skeleton className="h-full w-full" />
              ) : insightsError ? (
                <div className="flex h-full items-center justify-center">
                  <p className="max-w-xs text-center text-sm text-red-500">
                    {insightsError}
                  </p>
                </div>
              ) : hasChannelDistributionData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={channelDistributionData}
                    layout="vertical"
                    margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: "#6b7280", fontSize: 12 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="channel"
                      tick={{ fill: "#6b7280", fontSize: 12 }}
                      width={120}
                    />
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
                      stackId="messages"
                      fill="#04102D"
                      name="Enviados"
                      radius={[0, 4, 4, 0]}
                    />
                    <Bar
                      dataKey="received"
                      stackId="messages"
                      fill="#4bc3fe"
                      name="Recibidos"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="max-w-xs text-center text-sm text-gray-500">
                    No hay actividad registrada para los filtros seleccionados.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <motion.div
            variants={itemVariants}
            className="rounded-lg bg-white p-6 shadow-md xl:col-span-2"
          >
            <div className="mb-4 space-y-2">
              <h3 className="font-semibold text-gray-800">
                Rendimiento de flujos
              </h3>
              <p className="text-sm text-gray-500">
                Revisa la tasa de éxito de los flujos con más sesiones en el
                periodo activo.
              </p>
            </div>
            <div className="h-[300px]">
              {insightsLoading ? (
                <Skeleton className="h-full w-full" />
              ) : insightsError ? (
                <div className="flex h-full items-center justify-center">
                  <p className="max-w-xs text-center text-sm text-red-500">
                    {insightsError}
                  </p>
                </div>
              ) : hasFlowPerformanceData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flowPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="flowName"
                      tick={{ fill: "#6b7280", fontSize: 12 }}
                      interval={0}
                    />
                    <YAxis
                      tick={{ fill: "#6b7280", fontSize: 12 }}
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "0.5rem",
                      }}
                      formatter={(value: number | string) => [
                        typeof value === "number" ? `${value}%` : value,
                        "Tasa de éxito",
                      ]}
                      labelFormatter={(label) => `Flujo: ${label}`}
                    />
                    <Legend wrapperStyle={{ fontSize: "14px" }} />
                    <Bar
                      dataKey="successRate"
                      fill="#10b981"
                      name="Tasa de éxito"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="max-w-sm text-center text-sm text-gray-500">
                    No se registraron sesiones de flujo con los filtros
                    aplicados.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
          <motion.div
            variants={itemVariants}
            className="rounded-lg bg-white p-6 shadow-md"
          >
            <div className="mb-4 space-y-2">
              <h3 className="font-semibold text-gray-800">
                Estados de mensajes
              </h3>
              <p className="text-sm text-gray-500">
                Distribución de estados para los filtros activos.
              </p>
            </div>
            {insightsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={`status-skeleton-${index}`} className="space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
              </div>
            ) : insightsError ? (
              <div className="flex h-full items-center justify-center">
                <p className="max-w-xs text-center text-sm text-red-500">
                  {insightsError}
                </p>
              </div>
            ) : hasStatusBreakdownData ? (
              <div className="space-y-4">
                {statusBreakdownWithPercentage.map((status) => (
                  <div key={status.status} className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-medium text-gray-700">
                      <span>{status.status}</span>
                      <span className="text-sm text-gray-500">
                        {numberFormatter.format(status.count)} ·{" "}
                        {percentageFormatter.format(status.percentage)}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-indigo-500"
                        style={{
                          width: `${Math.min(status.percentage, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Aún no hay mensajes registrados para mostrar un desglose.
              </p>
            )}
          </motion.div>
        </div>
        <motion.div
          variants={itemVariants}
          className="rounded-lg bg-white p-6 shadow-md"
        >
          <h3 className="mb-4 font-semibold text-gray-800">
            Actividad Reciente
          </h3>
          {recentLogs.length ? (
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
                  <li
                    key={log.id}
                    className="flex items-center justify-between"
                  >
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
          ) : (
            <p className="text-sm text-gray-500">
              No se registraron eventos en el rango seleccionado.
            </p>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default DashboardPage;
