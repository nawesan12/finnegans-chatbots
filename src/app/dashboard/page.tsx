"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
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
import {
  MessageSquare,
  Bot,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  MoreVertical,
  Upload,
  Search,
  ArrowRight,
  BarChart2,
  Save,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import CreateNewDropdown from "@/components/CreateNewDropdown";
import ImportContactsModal from "@/components/ImportContactsModal";
import FlowBuilder from "@/components/FlowBuilder";
import { fetcher } from "@/lib/api";

// Animation Variants
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};
const pageTransition = { type: "tween", ease: "anticipate", duration: 0.5 };
const containerVariants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

// --- Main UI Components ---

const Sidebar = ({
  activePage,
  setActivePage,
  isCollapsed,
  setIsCollapsed,
}) => {
  const navItems = [
    { id: "dashboard", icon: BarChart2, label: "Panel de Control" },
    { id: "flows", icon: Bot, label: "Flujos" },
    { id: "logs", icon: MessageSquare, label: "Registros" },
    { id: "contacts", icon: Users, label: "Contactos" },
    { id: "settings", icon: Settings, label: "Configuración" },
  ];

  return (
    <motion.aside
      animate={{ width: isCollapsed ? "5rem" : "16rem" }}
      transition={{ duration: 0.3 }}
      className="bg-[#04102D] text-white flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-700 h-16">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center"
          >
            <Image src="/finnegans.svg" alt="Logo" width={200} height={200} />
          </motion.div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-gray-700"
        >
          {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-2">
        {navItems.map((item) => (
          <a
            key={item.id}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActivePage(item.id);
            }}
            className={`flex items-center p-3 rounded-lg transition-colors ${
              activePage === item.id ? "bg-[#4bc3fe]" : "hover:bg-gray-700"
            }`}
          >
            <item.icon className="h-5 w-5" />
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="ml-4 font-medium"
              >
                {item.label}
              </motion.span>
            )}
          </a>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center">
          <Image
            className="h-10 w-10 rounded-full object-cover"
            src="https://placehold.co/100x100/6366f1/white?text=A"
            alt="Admin"
            width={40}
            height={40}
          />
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="ml-3"
            >
              <p className="text-sm font-medium">Admin User</p>
              <p className="text-xs text-gray-400">admin@botflow.io</p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.aside>
  );
};

const Header = ({ title, onImportClick }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleImportAndCloseDropdown = () => {
    onImportClick();
    setIsDropdownOpen(false);
  };

  return (
    <header className="bg-white shadow-sm p-4 h-16 flex items-center justify-between border-b z-10">
      <h1 className="text-2xl font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center space-x-4">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-gray-700"
        >
          <Search className="h-5 w-5" />
        </motion.button>
        <div className="relative" ref={dropdownRef}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="bg-[#8694ff] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-indigo-700 flex items-center space-x-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Crear nuevo</span>
          </motion.button>
          <CreateNewDropdown
            isOpen={isDropdownOpen}
            onImportClick={handleImportAndCloseDropdown}
          />
        </div>
      </div>
    </header>
  );
};

const MetricCard = ({ title, value, change, icon: Icon }) => (
  <motion.div
    variants={itemVariants}
    className="bg-white p-6 rounded-lg shadow-md flex items-start justify-between"
  >
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
      {change && <p className="text-xs text-gray-400 mt-2">{change}</p>}
    </div>
    <div className="bg-indigo-100 p-3 rounded-full">
      <Icon className="h-6 w-6 text-indigo-600" />
    </div>
  </motion.div>
);

const Dashboard = ({ logs, contacts }) => {
    const metrics = useMemo(() => {
        const totalContacts = contacts.length;
        const activeConversations = logs.filter(log => log.status === 'In Progress').length;
        // These would need more complex logic/data
        const messagesSent = 0;
        const flowSuccessRate = 'N/A';

        return [
          {
            title: "Contactos Totales",
            value: totalContacts,
            icon: Users,
          },
          {
            title: "Conversaciones Activas",
            value: activeConversations,
            icon: MessageSquare,
          },
          {
            title: "Mensajes Enviados",
            value: messagesSent,
            icon: ArrowRight,
          },
          {
            title: "Ratio de Exito",
            value: flowSuccessRate,
            icon: Bot,
          },
        ];
    }, [logs, contacts]);

    const chartData = useMemo(() => {
        // This would need to be calculated from logs
        return [];
    }, []);

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
            {logs.slice(0, 4).map((log) => (
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

const Table = ({ columns, data }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full bg-white">
      <thead className="bg-gray-50">
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <motion.tbody
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="divide-y divide-gray-200"
      >
        {data.map((row) => (
          <motion.tr
            key={row.id}
            variants={itemVariants}
            className="hover:bg-gray-50"
          >
            {columns.map((col) => (
              <td
                key={col.key}
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
              >
                {col.render ? col.render(row) : row[col.key]}
              </td>
            ))}
          </motion.tr>
        ))}
      </motion.tbody>
    </table>
  </div>
);

const Logs = ({ logs }) => {
  const columns = [
    { key: "contact", label: "Contact", render: (row) => row.contact.name },
    { key: "flow", label: "Flow", render: (row) => row.flow.name },
    { key: "timestamp", label: "Timestamp", render: (row) => new Date(row.createdAt).toLocaleString() },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const colors = {
          Completed: "bg-green-100 text-green-800",
          "In Progress": "bg-blue-100 text-blue-800",
          Error: "bg-red-100 text-red-800",
        };
        return (
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
              colors[row.status] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {row.status}
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: () => (
        <button className="text-[#4bc3fe] hover:text-indigo-900">
          <MoreVertical className="h-5 w-5" />
        </button>
      ),
    },
  ];
  return (
    <div className="p-6">
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-lg shadow-md"
      >
        <Table columns={columns} data={logs} />
      </motion.div>
    </div>
  );
};

const Contacts = ({ contacts, onImportClick }) => {
  const columns = [
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone" },
    {
      key: "tags",
      label: "Tags",
      render: (row) => (
        <div className="flex space-x-1">
          {row.tags.map((tag) => (
            <span
              key={tag.tag.id}
              className="px-2 text-xs font-semibold rounded-full bg-gray-200 text-gray-700"
            >
              {tag.tag.name}
            </span>
          ))}
        </div>
      ),
    },
    { key: "lastContact", label: "Last Contact", render: (row) => new Date(row.updatedAt).toLocaleDateString() },
    {
      key: "actions",
      label: "Actions",
      render: () => (
        <button className="text-[#4bc3fe] hover:text-indigo-900">
          <MoreVertical className="h-5 w-5" />
        </button>
      ),
    },
  ];
  return (
    <div className="p-6">
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-lg shadow-md"
      >
        <div className="p-4 flex justify-end">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onImportClick}
            className="bg-[#8694ff] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-indigo-700 flex items-center space-x-2 transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span>Importar Contactos</span>
          </motion.button>
        </div>
        <Table columns={columns} data={contacts} />
      </motion.div>
    </div>
  );
};

import { useNodesState, useEdgesState, addEdge } from "reactflow";
import { toast } from "sonner";

const Flows = ({ flows, setFlows }) => {
  const [editingFlow, setEditingFlow] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  useEffect(() => {
    if (editingFlow && editingFlow.definition) {
      setNodes(editingFlow.definition.nodes || []);
      setEdges(editingFlow.definition.edges || []);
    }
  }, [editingFlow, setNodes, setEdges]);

  const handleSaveFlow = async () => {
    if (!editingFlow) return;

    const definition = { nodes, edges };
    try {
      await fetcher(`/api/flows/${editingFlow.id}`, {
        method: "PUT",
        body: JSON.stringify({ definition }),
      });
      toast.success("Flow saved successfully");
      // refetch flows
      fetcher("/api/flows").then(setFlows);
      setEditingFlow(null);
    } catch {
      toast.error("Failed to save flow");
    }
  };

  const columns = [
    { key: "name", label: "Flow Name" },
    { key: "trigger", label: "Trigger Keyword" },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const colors = {
          Active: "bg-green-100 text-green-800",
          Draft: "bg-yellow-100 text-yellow-800",
          Inactive: "bg-gray-100 text-gray-800",
        };
        return (
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
              colors[row.status] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {row.status}
          </span>
        );
      },
    },
    { key: "lastModified", label: "Last Modified", render: (row) => new Date(row.updatedAt).toLocaleDateString() },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => setEditingFlow(row)}
            className="text-[#4bc3fe] hover:text-indigo-900 font-medium"
          >
            Edit
          </button>
          <button className="text-gray-500 hover:text-gray-800">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AnimatePresence>
      {editingFlow ? (
        <motion.div
          key="flow-builder"
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ duration: 0.4 }}
          className="h-full flex flex-col absolute top-0 left-0 w-full"
        >
          <div className="p-4 bg-white border-b flex items-center justify-between z-10">
            <button
              onClick={() => setEditingFlow(null)}
              className="text-gray-600 hover:text-gray-900 flex items-center"
            >
              <ChevronLeft className="h-5 w-5 mr-1" /> Volver a Flujos
            </button>
            <h2 className="text-xl font-semibold text-gray-800">
              {editingFlow.name}
            </h2>
            <button
              onClick={handleSaveFlow}
              className="flex items-center gap-2 bg-[#4bc3fe] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-indigo-700"
            >
              <Save className="h-5 w-5 mr-1" /> Guardar Flujo
            </button>
          </div>
          <div className="flex-1">
            <FlowBuilder
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
            />
          </div>
        </motion.div>
      ) : (
        <motion.div key="flow-list" className="p-6">
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-lg shadow-md"
          >
            <Table columns={columns} data={flows} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Main App Component
export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [contacts, setContacts] = useState([]);
  const [flows, setFlows] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [contactsData, flowsData, logsData] = await Promise.all([
          fetcher("/api/contacts"),
          fetcher("/api/flows"),
          fetcher("/api/logs"),
        ]);
        setContacts(contactsData);
        setFlows(flowsData);
        setLogs(logsData);
      } catch (err) {
        console.error("Failed to fetch data", err);
        // Here you might want to redirect to a login page
        // if the error status is 401
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const pageTitles = {
    dashboard: "Panel de Control",
    flows: "Flujos de Mensajes",
    logs: "Registros",
    contacts: "Contactos",
    settings: "Configuración",
  };

  const handleOpenImportModal = () => {
    setActivePage("contacts");
    setIsImportModalOpen(true);
  };

  const renderPage = () => {
    if (loading) {
        return <div className="p-6">Loading...</div>;
    }

    switch (activePage) {
      case "dashboard":
        return <Dashboard logs={logs} contacts={contacts} />;
      case "flows":
        return <Flows flows={flows} setFlows={setFlows} />;
      case "logs":
        return <Logs logs={logs} />;
      case "contacts":
        return (
          <Contacts
            contacts={contacts}
            onImportClick={() => setIsImportModalOpen(true)}
          />
        );
      case "settings":
        return (
          <div className="p-6">
            <h2 className="text-xl">Settings Page</h2>
          </div>
        );
      default:
        return <Dashboard logs={logs} contacts={contacts} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      <main className="flex-1 flex flex-col overflow-x-hidden relative">
        <Header
          title={pageTitles[activePage]}
          onImportClick={handleOpenImportModal}
        />
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <ImportContactsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => {
            // Refetch contacts after import
            fetcher("/api/contacts").then(setContacts);
        }}
      />
    </div>
  );
}
