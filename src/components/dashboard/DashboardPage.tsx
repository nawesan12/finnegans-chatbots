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

const chartData = [
  { name: "Mon", sent: 400, received: 240 },
  { name: "Tue", sent: 300, received: 139 },
  { name: "Wed", sent: 200, received: 980 },
  { name: "Thu", sent: 278, received: 390 },
  { name: "Fri", sent: 189, received: 480 },
  { name: "Sat", sent: 239, received: 380 },
  { name: "Sun", sent: 349, received: 430 },
];

const DashboardPage = () => {
  const { token, hasHydrated } = useAuthStore((state) => ({
    token: state.token,
    hasHydrated: state.hasHydrated,
  }));
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [loading, setLoading] = useState(true);

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

  const metricCards = useMemo(() => {
    const data: DashboardMetrics =
      metrics ?? {
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
          <h3 className="font-semibold text-gray-800 mb-4">
            Volumen de Mensajes (Últimos 7 Días)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
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
                name="Sent"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="received"
                fill="#4bc3fe"
                name="Received"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
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
                  : log.contact?.phone ?? "Contacto sin nombre";

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
        </motion.div>
      </motion.div>
    </div>
  );
};

export default DashboardPage;
