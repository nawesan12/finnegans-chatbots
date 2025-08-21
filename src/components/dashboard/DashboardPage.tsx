"use client";
import React, { useMemo } from "react";
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
import { initialMetrics, chartData, initialLogs } from "@/data/mock-data";
import { containerVariants, itemVariants } from "@/lib/animations";
import MetricCard from "@/components/dashboard/MetricCard";

const DashboardPage = () => {
  const metrics = useMemo(
    () => [
      {
        title: "Contactos Totales",
        value: initialMetrics.totalContacts,
        change: "+5% this month",
        icon: Users,
      },
      {
        title: "Conversaciones Activas",
        value: initialMetrics.activeConversations,
        change: "-2% today",
        icon: MessageSquare,
      },
      {
        title: "Mensajes Enviados",
        value: initialMetrics.messagesSent,
        change: "+12% this week",
        icon: ArrowRight,
      },
      {
        title: "Ratio de Exito",
        value: initialMetrics.flowSuccessRate,
        change: "+1.2% this month",
        icon: Bot,
      },
    ],
    []
  );

  return (
    <div className="p-6 space-y-6">
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {metrics.map((metric) => (
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
            {initialLogs.slice(0, 4).map((log) => (
              <li key={log.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-700">{log.contact}</p>
                  <p className="text-sm text-gray-500">{log.flow}</p>
                </div>
                <span className="text-sm text-gray-400">
                  {log.timestamp.split(" ")[1]} {log.timestamp.split(" ")[2]}
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
