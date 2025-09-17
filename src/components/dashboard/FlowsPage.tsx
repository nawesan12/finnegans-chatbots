"use client";
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MoreVertical,
  ChevronLeft,
  Save,
  Plus,
  Loader2,
  Share2,
  PlayCircle,
  Hash,
  Clock3,
  Search,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { containerVariants, itemVariants } from "@/lib/animations";
import MetricCard from "@/components/dashboard/MetricCard";
import Table from "@/components/dashboard/Table";
import FlowBuilder, {
  FlowBuilderHandle,
  FlowData,
} from "@/components/flow-builder";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type FlowStatus = "Active" | "Draft" | "Inactive" | string;
type StatusFilter = "all" | "Active" | "Draft" | "Inactive";

type FlowWithCounts = {
  id: string;
  name: string;
  trigger: string;
  status: FlowStatus;
  phoneNumber?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  definition?: FlowData | null;
  _count?: {
    broadcasts: number;
    sessions: number;
  };
};

type EditingFlow = (Partial<FlowWithCounts> & { id: string | null }) | null;

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "Active", label: "Activos" },
  { value: "Draft", label: "Borradores" },
  { value: "Inactive", label: "Inactivos" },
];

const FlowsPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const openFlowQuery = searchParams.get("openFlow");
  const { user } = useAuthStore();
  const [flows, setFlows] = useState<FlowWithCounts[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingFlow, setEditingFlow] = useState<EditingFlow>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [rowActionFlowId, setRowActionFlowId] = useState<string | null>(null);

  const flowBuilderRef = useRef<FlowBuilderHandle>(null);

  const fetchFlows = useCallback(async () => {
    if (!user?.id) {
      setFlows([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/flows?userId=${user.id}`);
      if (!response.ok) {
        throw new Error("No se pudieron obtener los flujos");
      }
      const data: FlowWithCounts[] = await response.json();
      setFlows(data);
    } catch (error) {
      toast.error(
        (error as Error)?.message ?? "Error al cargar los flujos disponibles",
      );
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchFlows();
  }, [fetchFlows]);

  useEffect(() => {
    if (!openFlowQuery || !flows.length) return;

    const targetFlow = flows.find((flow) => flow.id === openFlowQuery);
    if (!targetFlow) return;

    setEditingFlow((current) =>
      current?.id === targetFlow.id
        ? current
        : { ...targetFlow, phoneNumber: targetFlow.phoneNumber ?? "" },
    );

    const params = new URLSearchParams(searchParamsString);
    params.delete("openFlow");
    const nextQuery = params.toString();

    router.replace(
      `/dashboard/flows${nextQuery ? `?${nextQuery}` : ""}`,
      { scroll: false },
    );
  }, [flows, openFlowQuery, router, searchParamsString]);

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat("es-AR", {
        maximumFractionDigits: 0,
      }),
    [],
  );

  const metrics = useMemo(() => {
    const total = flows.length;
    const active = flows.filter((flow) => flow.status === "Active").length;
    const uniqueTriggers = new Set(
      flows
        .map((flow) => flow.trigger?.toLowerCase().trim())
        .filter((value): value is string => Boolean(value)),
    ).size;
    const updatedRecently = flows.filter((flow) => {
      if (!flow.updatedAt) return false;
      const updatedAt = new Date(flow.updatedAt).getTime();
      const now = Date.now();
      const thirtyDays = 1000 * 60 * 60 * 24 * 30;
      return now - updatedAt <= thirtyDays;
    }).length;

    return [
      {
        title: "Flujos creados",
        value: numberFormatter.format(total),
        change:
          active > 0
            ? `${numberFormatter.format(active)} activos actualmente`
            : "Activa tu primer flujo",
        icon: Share2,
      },
      {
        title: "Flujos activos",
        value: numberFormatter.format(active),
        change:
          total > 0
            ? `${Math.round((active / total) * 100)}% del total`
            : "Aún sin flujos publicados",
        icon: PlayCircle,
      },
      {
        title: "Palabras clave únicas",
        value: numberFormatter.format(uniqueTriggers),
        change:
          uniqueTriggers === total
            ? "Sin disparadores duplicados"
            : "Revisa disparadores repetidos",
        icon: Hash,
      },
      {
        title: "Actualizados recientemente",
        value: numberFormatter.format(updatedRecently),
        change:
          updatedRecently > 0
            ? "En los últimos 30 días"
            : "Actualiza tus flujos más antiguos",
        icon: Clock3,
      },
    ];
  }, [flows, numberFormatter]);

  const filteredFlows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return flows.filter((flow) => {
      const matchesStatus =
        statusFilter === "all" || flow.status === statusFilter;
      if (!matchesStatus) return false;

      if (!term) return true;

      const nameMatch = flow.name.toLowerCase().includes(term);
      const triggerMatch = flow.trigger?.toLowerCase().includes(term) ?? false;
      const phoneMatch =
        flow.phoneNumber?.toLowerCase().includes(term) ?? false;

      return nameMatch || triggerMatch || phoneMatch;
    });
  }, [flows, statusFilter, searchTerm]);

  const handleCreateNewFlow = () => {
    if (!user?.id) {
      toast.error("Necesitas iniciar sesión para crear flujos");
      return;
    }

    setEditingFlow({
      id: null,
      name: "Nuevo flujo",
      definition: null,
      status: "Draft",
      trigger: "default",
      phoneNumber: "",
      userId: user.id,
    });
  };

  const openFlowInBuilder = useCallback((flow: FlowWithCounts) => {
    setEditingFlow({ ...flow, phoneNumber: flow.phoneNumber ?? "" });
  }, []);

  const handleDuplicateFlow = useCallback(
    async (flow: FlowWithCounts) => {
      if (!flow?.id) return;

      try {
        setRowActionFlowId(flow.id);
        const response = await fetch(`/api/flows/${flow.id}/duplicate`, {
          method: "POST",
        });
        const raw = await response.text();

        if (!response.ok) {
          let errorMessage = "No se pudo duplicar el flujo";
          try {
            const parsed = JSON.parse(raw) as { error?: string };
            if (parsed?.error) {
              errorMessage = parsed.error;
            }
          } catch (error) {
            console.error("Error parsing duplicate flow response:", error);
          }
          throw new Error(errorMessage);
        }

        const duplicated = raw
          ? (JSON.parse(raw) as FlowWithCounts)
          : null;

        if (!duplicated) {
          throw new Error("No se pudo duplicar el flujo");
        }

        toast.success(`Flujo duplicado a partir de "${flow.name}"`);
        openFlowInBuilder(duplicated);
        await fetchFlows();
      } catch (error) {
        toast.error(
          (error as Error)?.message ??
            "Error al duplicar el flujo seleccionado",
        );
      } finally {
        setRowActionFlowId(null);
      }
    },
    [fetchFlows, openFlowInBuilder],
  );

  const handleDeleteFlow = useCallback(
    async (flow: FlowWithCounts) => {
      if (!flow?.id) return;

      const confirmed = window.confirm(
        `¿Eliminar el flujo "${flow.name}" y sus registros asociados?`,
      );
      if (!confirmed) return;

      try {
        setRowActionFlowId(flow.id);
        const response = await fetch(`/api/flows/${flow.id}`, {
          method: "DELETE",
        });
        const raw = await response.text();

        if (!response.ok) {
          let errorMessage = "No se pudo eliminar el flujo";
          try {
            const parsed = JSON.parse(raw) as { error?: string };
            if (parsed?.error) {
              errorMessage = parsed.error;
            }
          } catch (error) {
            console.error("Error parsing delete flow response:", error);
          }
          throw new Error(errorMessage);
        }

        toast.success("Flujo eliminado correctamente");
        setFlows((prev) => prev.filter((item) => item.id !== flow.id));
        if (editingFlow?.id === flow.id) {
          setEditingFlow(null);
        }
        await fetchFlows();
      } catch (error) {
        toast.error(
          (error as Error)?.message ??
            "Error al eliminar el flujo seleccionado",
        );
      } finally {
        setRowActionFlowId(null);
      }
    },
    [editingFlow?.id, fetchFlows],
  );

  const handleUseInBroadcast = useCallback(
    (flow: FlowWithCounts) => {
      if (!flow?.id) return;
      router.push(`/dashboard/broadcasts?flowId=${flow.id}`);
    },
    [router],
  );

  const handleSaveFlow = async () => {
    if (!editingFlow || !flowBuilderRef.current) return;
    if (!user?.id) {
      toast.error("Necesitas iniciar sesión para guardar flujos");
      return;
    }

    const trimmedName = editingFlow.name?.trim();
    if (!trimmedName) {
      toast.error("Asigna un nombre al flujo antes de guardar");
      return;
    }

    try {
      setIsSaving(true);
      const flowData = flowBuilderRef.current.getFlowData();
      const triggerNode = flowData?.nodes?.find(
        (node) => node.type === "trigger",
      );
      const keyword = String(
        ((triggerNode?.data as { keyword?: string })?.keyword ??
          editingFlow.trigger ??
          "default") || "default",
      ).trim();
      const normalizedTrigger = keyword.length ? keyword : "default";
      const normalizedPhone = editingFlow.phoneNumber?.trim() || null;
      const isNewFlow = !editingFlow.id;

      const url = isNewFlow ? "/api/flows" : `/api/flows/${editingFlow.id}`;
      const method = isNewFlow ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          trigger: normalizedTrigger,
          status: editingFlow.status ?? "Draft",
          definition: flowData,
          phoneNumber: normalizedPhone,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `No se pudo ${isNewFlow ? "crear" : "guardar"} el flujo`,
        );
      }

      const updatedFlow: FlowWithCounts = await response.json();
      setEditingFlow({
        ...updatedFlow,
        phoneNumber: updatedFlow.phoneNumber ?? "",
      });
      toast.success(
        `Flujo ${isNewFlow ? "creado" : "actualizado"} correctamente`,
      );
      await fetchFlows();
    } catch (error) {
      toast.error(
        (error as Error)?.message ?? "Ocurrió un error al guardar el flujo",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = useCallback(
    async (flowId: string, nextStatus: string) => {
      const flow = flows.find((item) => item.id === flowId);
      if (!flow) return;

      try {
        setUpdatingStatusId(flowId);
        const response = await fetch(`/api/flows/${flowId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: flow.name,
            trigger: flow.trigger,
            status: nextStatus,
            definition: flow.definition,
            phoneNumber: flow.phoneNumber ?? null,
          }),
        });

        if (!response.ok) {
          throw new Error("No se pudo actualizar el estado del flujo");
        }

        const updated = await response.json();
        setFlows((prev) =>
          prev.map((item) =>
            item.id === flowId
              ? { ...item, ...updated, _count: item._count }
              : item,
          ),
        );
        toast.success("Estado del flujo actualizado");
      } catch (error) {
        toast.error(
          (error as Error)?.message ?? "Error al actualizar el estado",
        );
      } finally {
        setUpdatingStatusId(null);
      }
    },
    [flows],
  );

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Nombre del flujo",
        render: (row: FlowWithCounts) => (
          <div className="space-y-1">
            <p className="font-semibold text-gray-800">{row.name}</p>
            <p className="text-xs text-gray-500">
              Actualizado{" "}
              {new Date(row.updatedAt).toLocaleString("es-AR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          </div>
        ),
      },
      {
        key: "phoneNumber",
        label: "Número de teléfono",
        render: (row: FlowWithCounts) => row.phoneNumber || "Sin asignar",
      },
      { key: "trigger", label: "Palabra clave" },
      {
        key: "status",
        label: "Estado",
        render: (row: FlowWithCounts) => (
          <div className="flex items-center gap-2">
            <Select
              value={row.status}
              onValueChange={(value) => handleStatusChange(row.id, value)}
              disabled={updatingStatusId === row.id}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Activo</SelectItem>
                <SelectItem value="Draft">Borrador</SelectItem>
                <SelectItem value="Inactive">Inactivo</SelectItem>
              </SelectContent>
            </Select>
            {updatingStatusId === row.id && (
              <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
            )}
          </div>
        ),
      },
      {
        key: "broadcasts",
        label: "Campañas",
        render: (row: FlowWithCounts) =>
          numberFormatter.format(row._count?.broadcasts ?? 0),
      },
      {
        key: "sessions",
        label: "Sesiones",
        render: (row: FlowWithCounts) =>
          numberFormatter.format(row._count?.sessions ?? 0),
      },
      {
        key: "actions",
        label: "Acciones",
        render: (row: FlowWithCounts) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={rowActionFlowId === row.id}
              >
                {rowActionFlowId === row.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreVertical className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem
                disabled={rowActionFlowId === row.id}
                onSelect={() => openFlowInBuilder(row)}
              >
                Abrir en constructor
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={rowActionFlowId === row.id}
                onSelect={() => handleUseInBroadcast(row)}
              >
                Usar en campaña
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={rowActionFlowId === row.id}
                onSelect={() => handleDuplicateFlow(row)}
              >
                Duplicar flujo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={rowActionFlowId === row.id}
                className="text-red-600 focus:text-red-600"
                onSelect={() => handleDeleteFlow(row)}
              >
                Eliminar flujo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [
      handleDeleteFlow,
      handleDuplicateFlow,
      handleStatusChange,
      handleUseInBroadcast,
      numberFormatter,
      openFlowInBuilder,
      rowActionFlowId,
      updatingStatusId,
    ],
  );

  const initialFlow = useMemo<Partial<FlowData> | null>(
    () => editingFlow?.definition ?? null,
    [editingFlow?.definition],
  );

  const isInitialLoading = loading && !flows.length && !editingFlow;

  if (isInitialLoading) {
    return (
      <div className="flex h-full items-center justify-center py-16 text-sm text-gray-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Cargando flujos...
      </div>
    );
  }

  return (
    <AnimatePresence>
      {editingFlow ? (
        <motion.div
          key="flow-builder"
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ duration: 0.4 }}
          className="absolute left-0 top-0 flex h-full w-full flex-col bg-white"
        >
          <div className="border-b bg-white p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <button
                onClick={() => setEditingFlow(null)}
                className="flex items-center text-sm text-gray-600 transition hover:text-gray-900"
              >
                <ChevronLeft className="mr-1 h-5 w-5" />
                Volver a flujos
              </button>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Input
                  placeholder="Nombre del flujo"
                  value={editingFlow?.name ?? ""}
                  onChange={(event) =>
                    setEditingFlow((current) =>
                      current
                        ? { ...current, name: event.target.value }
                        : current,
                    )
                  }
                  className="w-full sm:w-64"
                />
                <Select
                  value={(editingFlow?.status as string) ?? "Draft"}
                  onValueChange={(value) =>
                    setEditingFlow((current) =>
                      current ? { ...current, status: value } : current,
                    )
                  }
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Borrador</SelectItem>
                    <SelectItem value="Active">Activo</SelectItem>
                    <SelectItem value="Inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Número de WhatsApp"
                  value={editingFlow?.phoneNumber ?? ""}
                  onChange={(event) =>
                    setEditingFlow((current) =>
                      current
                        ? { ...current, phoneNumber: event.target.value }
                        : current,
                    )
                  }
                  className="w-full sm:w-56"
                />
                <Button
                  type="button"
                  onClick={handleSaveFlow}
                  className="bg-[#4bc3fe] text-white hover:bg-indigo-700"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Save className="h-4 w-4" />
                      Guardar flujo
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <FlowBuilder ref={flowBuilderRef} initialFlow={initialFlow} />
          </div>
        </motion.div>
      ) : (
        <motion.div key="flow-list" className="space-y-6 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Flujos</h1>
              <p className="text-sm text-gray-500">
                Diseña las automatizaciones que continuarán tus envíos masivos.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={fetchFlows}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Actualizando...
                  </span>
                ) : (
                  "Actualizar"
                )}
              </Button>
              <Button
                type="button"
                onClick={handleCreateNewFlow}
                className="bg-[#8694ff] text-white hover:bg-indigo-700"
              >
                <Plus className="mr-2 h-5 w-5" />
                Crear flujo
              </Button>
            </div>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4"
          >
            {metrics.map((metric) => (
              <MetricCard key={metric.title} {...metric} />
            ))}
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="rounded-lg bg-white shadow-md"
          >
            <div className="space-y-4 p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  {statusFilters.map((status) => (
                    <Button
                      key={status.value}
                      type="button"
                      variant={
                        statusFilter === status.value ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setStatusFilter(status.value)}
                    >
                      {status.label}
                    </Button>
                  ))}
                </div>
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar por nombre, palabra clave o número"
                    className="pl-9"
                  />
                </div>
              </div>
              {loading && flows.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Actualizando listado...
                </div>
              )}
              <Table columns={columns} data={filteredFlows} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FlowsPage;
