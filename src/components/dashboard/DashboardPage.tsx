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
import {
  MessageSquare,
  Users,
  ArrowRight,
  Bot,
} from "lucide-react";
import { containerVariants, itemVariants } from "@/lib/animations";
import MetricCard from "@/components/dashboard/MetricCard";
import { toast } from "sonner";

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
  const [metrics, setMetrics] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [metricsRes, logsRes] = await Promise.all([
          fetch("/api/metrics"),
          fetch("/api/logs?limit=4"), // Assuming API supports limit
        ]);

        if (!metricsRes.ok) throw new Error("Failed to fetch metrics");
        if (!logsRes.ok) throw new Error("Failed to fetch recent logs");

        const metricsData = await metricsRes.json();
        const logsData = await logsRes.json();

        setMetrics(metricsData);
        setRecentLogs(logsData);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const metricCards = useMemo(
    () => metrics ? [
      {
        title: "Contactos Totales",
        value: metrics.totalContacts,
        change: "+5% this month",
        icon: Users,
      },
      {
        title: "Conversaciones Activas",
        value: metrics.activeConversations,
        change: "-2% today",
        icon: MessageSquare,
      },
      {
        title: "Mensajes Enviados",
        value: metrics.messagesSent,
        change: "+12% this week",
        icon: ArrowRight,
      },
      {
        title: "Ratio de Exito",
        value: metrics.flowSuccessRate,
        change: "+1.2% this month",
        icon: Bot,
      },
    ] : [],
    [metrics]
  );

  if (loading) {
    return <div>Loading dashboard...</div>
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
            {recentLogs.map((log) => (
              <li key={log.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-700">{log.contact.name}</p>
                  <p className="text-sm text-gray-500">{log.flow.name}</p>
                </div>
                <span className="text-sm text-gray-400">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default DashboardPage;
