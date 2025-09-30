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
  Megaphone,
  Copy as CopyIcon,
  Link as LinkIcon,
  Trash2,
  Pencil,
} from "lucide-react";
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
import { authenticatedFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
  const { user } = useAuthStore();
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [flows, setFlows] = useState<FlowWithCounts[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingFlow, setEditingFlow] = useState<EditingFlow>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [duplicatingFlowId, setDuplicatingFlowId] = useState<string | null>(null);
  const [deletingFlowId, setDeletingFlowId] = useState<string | null>(null);

  const flowBuilderRef = useRef<FlowBuilderHandle>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateOpenParam = useCallback(
    (value: string | null) => {
      if (!pathname) return;
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("open", value);
      } else {
        params.delete("open");
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const openFlowForEditing = useCallback(
    (flow: FlowWithCounts, options?: { skipUrl?: boolean }) => {
      setEditingFlow({
        ...flow,
        phoneNumber: flow.phoneNumber ?? "",
      });
      if (!options?.skipUrl) {
        updateOpenParam(flow.id);
      }
    },
    [updateOpenParam],
  );

  const startNewFlow = useCallback(
    (options?: { skipUrl?: boolean }) => {
      if (!user?.id) {
        toast.error("Necesitas iniciar sesión para crear flujos");
        return;
      }

      setEditingFlow({
        id: "",
        name: "Nuevo flujo",
        definition: null,
        status: "Draft",
        trigger: "default",
        phoneNumber: "",
        userId: user.id,
      });

      if (!options?.skipUrl) {
        updateOpenParam("new");
      }
    },
    [updateOpenParam, user?.id],
  );

  const handleCloseEditing = useCallback(() => {
    setEditingFlow(null);
    updateOpenParam(null);
  }, [updateOpenParam]);

  const handleGoToBroadcasts = useCallback(() => {
    if (!editingFlow?.id) {
      toast.message("Guarda el flujo antes de usarlo en campañas masivas");
      return;
    }
    router.push(`/dashboard/broadcasts?flowId=${editingFlow.id}`);
  }, [editingFlow?.id, router]);

  const handleCopyShareLink = useCallback((flow: FlowWithCounts) => {
    if (typeof window === "undefined") {
      toast.error("No se pudo copiar el enlace en este entorno");
      return;
    }

    const shareUrl = `${window.location.origin}/dashboard/flows?open=${flow.id}`;

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => {
          toast.success("Enlace copiado al portapapeles");
        })
        .catch((error) => {
          console.error("Error copying flow share link:", error);
          toast.error("No se pudo copiar el enlace. Intenta nuevamente.");
        });
      return;
    }

    const fallbackCopy = window.prompt(
      "Copia el enlace manualmente",
      shareUrl,
    );
    if (fallbackCopy !== null) {
      toast.message("Enlace disponible para copiar manualmente");
    }
  }, []);

  const handleDuplicateFlow = useCallback(
    async (flow: FlowWithCounts) => {
      if (!token) {
        toast.error("Necesitas iniciar sesión para duplicar flujos");
        return;
      }

      try {
        setDuplicatingFlowId(flow.id);
        const response = await fetch(`/api/flows`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: `${flow.name} (copia)`,
            trigger: flow.trigger,
            status: "Draft",
            definition: flow.definition,
            phoneNumber: flow.phoneNumber ?? null,
          }),
        });

        if (!response.ok) {
          throw new Error("No se pudo duplicar el flujo");
        }

        const duplicatedFlow: FlowWithCounts = await response.json();
        toast.success("Flujo duplicado correctamente");
        openFlowForEditing(duplicatedFlow);
        await fetchFlows();
      } catch (error) {
        console.error("Error duplicating flow:", error);
        toast.error(
          (error as Error)?.message ?? "Ocurrió un problema al duplicar el flujo",
        );
      } finally {
        setDuplicatingFlowId(null);
      }
    },
    [fetchFlows, openFlowForEditing, token],
  );

  const handleDeleteFlow = useCallback(
    async (flow: FlowWithCounts) => {
      if (typeof window !== "undefined") {
        const confirmed = window.confirm(
          "¿Seguro que deseas eliminar este flujo? Esta acción no se puede deshacer.",
        );
        if (!confirmed) {
          return;
        }
      }

      if (!token) {
        toast.error("Necesitas iniciar sesión para eliminar flujos");
        return;
      }

      try {
        setDeletingFlowId(flow.id);
        const response = await fetch(`/api/flows/${flow.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("No se pudo eliminar el flujo");
        }

        if (editingFlow?.id === flow.id) {
          handleCloseEditing();
        }

        await fetchFlows();
        toast.success("Flujo eliminado correctamente");
      } catch (error) {
        console.error("Error deleting flow:", error);
        toast.error(
          (error as Error)?.message ?? "Ocurrió un error al eliminar el flujo",
        );
      } finally {
        setDeletingFlowId(null);
      }
    },
    [editingFlow?.id, fetchFlows, handleCloseEditing, token],
  );

  const fetchFlows = useCallback(async () => {
    if (!user?.id || !token) {
      setFlows([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await authenticatedFetch(`/api/flows`);
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
  }, [token, user?.id]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!user?.id || !token) {
      return;
    }

    fetchFlows();
  }, [fetchFlows, hasHydrated, token, user?.id]);

  useEffect(() => {
    const openParam = searchParams.get("open");
    if (!openParam) return;

    if (openParam === "new") {
      if (!editingFlow && user?.id) {
        startNewFlow({ skipUrl: true });
      }
      return;
    }

    if (!flows.length || editingFlow?.id === openParam) {
      return;
    }

    const flowToOpen = flows.find((flow) => flow.id === openParam);
    if (flowToOpen) {
      openFlowForEditing(flowToOpen, { skipUrl: true });
    }
  }, [
    editingFlow,
    flows,
    openFlowForEditing,
    searchParams,
    startNewFlow,
    user?.id,
  ]);

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

  const hasActiveFilters =
    statusFilter !== "all" || Boolean(searchTerm.trim());

  const handleCreateNewFlow = () => {
    startNewFlow();
  };

  const handleSaveFlow = useCallback(
    async (definitionOverride?: FlowData) => {
      if (!editingFlow) {
        toast.error("Selecciona o crea un flujo antes de guardar");
        return false;
      }
      if (!user?.id) {
        toast.error("Necesitas iniciar sesión para guardar flujos");
        return false;
      }

      const trimmedName = editingFlow.name?.trim();
      if (!trimmedName) {
        toast.error("Asigna un nombre al flujo antes de guardar");
        return false;
      }

      const flowData =
        definitionOverride ?? flowBuilderRef.current?.getFlowData();
      if (!flowData) {
        toast.error("No pudimos leer el flujo a guardar");
        return false;
      }

      try {
        setIsSaving(true);
        const triggerNode = flowData?.nodes?.find(
          (node) => node.type === "trigger",
        );
        const keyword = String(
          ((triggerNode?.data as { keyword?: string })?.keyword ??
            editingFlow.trigger ??
            "default") ||
            "default",
        ).trim();
        const normalizedTrigger = keyword.length ? keyword : "default";
        const normalizedPhone = editingFlow.phoneNumber?.trim() || null;
        const isNewFlow = !editingFlow.id;

        const url = isNewFlow ? "/api/flows" : `/api/flows/${editingFlow.id}`;
        const method = isNewFlow ? "POST" : "PUT";

        const response = await authenticatedFetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: trimmedName,
            trigger: normalizedTrigger,
            status: editingFlow.status ?? "Draft",
            definition: flowData,
            phoneNumber: normalizedPhone,
          }),
        });

        if (!response.ok) {
          throw new Error(
            `No se pudo ${isNewFlow ? "crear" : "guardar"} el flujo`,
          );
        }

        const updatedFlow: FlowWithCounts = await response.json();
        openFlowForEditing(updatedFlow);
        toast.success(
          `Flujo ${isNewFlow ? "creado" : "actualizado"} correctamente`,
        );
        await fetchFlows();
        return true;
      } catch (error) {
        toast.error(
          (error as Error)?.message ?? "Ocurrió un error al guardar el flujo",
        );
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [editingFlow, fetchFlows, flowBuilderRef, openFlowForEditing, user?.id],
  );

  const handleStatusChange = useCallback(
    async (flowId: string, nextStatus: string) => {
      const flow = flows.find((item) => item.id === flowId);
      if (!flow) return;

      try {
        setUpdatingStatusId(flowId);
        const response = await authenticatedFetch(`/api/flows/${flowId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
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
        align: "right" as const,
        render: (row: FlowWithCounts) =>
          numberFormatter.format(row._count?.broadcasts ?? 0),
      },
      {
        key: "sessions",
        label: "Sesiones",
        align: "right" as const,
        render: (row: FlowWithCounts) =>
          numberFormatter.format(row._count?.sessions ?? 0),
      },
      {
        key: "actions",
        label: "Acciones",
        render: (row: FlowWithCounts) => (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="link"
              onClick={() => openFlowForEditing(row)}
              className="h-auto px-0 text-[#4bc3fe] hover:text-indigo-900"
            >
              Editar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-indigo-900"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onSelect={() => openFlowForEditing(row)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Abrir en el editor
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={duplicatingFlowId === row.id}
                  onSelect={() => {
                    void handleDuplicateFlow(row);
                  }}
                >
                  {duplicatingFlowId === row.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CopyIcon className="mr-2 h-4 w-4" />
                  )}
                  Duplicar flujo
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => handleCopyShareLink(row)}
                >
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Copiar enlace de edición
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={deletingFlowId === row.id}
                  onSelect={() => {
                    void handleDeleteFlow(row);
                  }}
                  className="text-red-600 focus:text-red-600"
                >
                  {deletingFlowId === row.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Eliminar flujo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [
      deletingFlowId,
      duplicatingFlowId,
      handleCopyShareLink,
      handleDeleteFlow,
      handleDuplicateFlow,
      handleStatusChange,
      numberFormatter,
      openFlowForEditing,
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
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-10 w-32 rounded-md" />
            <Skeleton className="h-10 w-36 rounded-md" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`flows-metric-skeleton-${index}`}
              className="rounded-lg bg-white p-6 shadow-md"
            >
              <div className="flex items-start justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
              <Skeleton className="mt-4 h-8 w-24" />
              <Skeleton className="mt-2 h-3 w-20" />
            </div>
          ))}
        </div>

        <div className="space-y-6 rounded-lg bg-white p-6 shadow-md">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {statusFilters.map((status, index) => (
                <Skeleton
                  key={`flows-filter-skeleton-${status.value}-${index}`}
                  className="h-9 w-24 rounded-full"
                />
              ))}
            </div>
            <Skeleton className="h-10 w-full max-w-sm rounded-md" />
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-100">
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-50">
                  <tr>
                    {columns.map((column: { key: string; label: string }) => (
                      <th
                        key={`flows-loading-header-${column.key}`}
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Array.from({ length: 5 }).map((_, rowIndex) => (
                    <tr key={`flows-loading-row-${rowIndex}`}>
                      <td className="px-6 py-4 text-sm">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-36" />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Skeleton className="h-4 w-32" />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Skeleton className="h-9 w-44 rounded-md" />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-6 w-6 rounded-full" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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
                onClick={handleCloseEditing}
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
                  variant="outline"
                  onClick={handleGoToBroadcasts}
                >
                  <Megaphone className="mr-2 h-4 w-4" />
                  Usar en campañas
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSaveFlow()}
                  className="bg-[#4bc3fe] text-white hover:bg-indigo-700"
                  disabled={
                    isSaving || !editingFlow?.name?.trim()?.length
                  }
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
            <FlowBuilder
              ref={flowBuilderRef}
              initialFlow={initialFlow}
              flowId={editingFlow?.id ?? null}
              flowName={editingFlow?.name ?? null}
              onSaveFlow={handleSaveFlow}
              savingFlow={isSaving}
              canSaveFlow={Boolean(editingFlow?.name?.trim()?.length)}
            />
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
              <Table
                columns={columns}
                data={filteredFlows}
                emptyState={{
                  title: hasActiveFilters
                    ? "No se encontraron flujos"
                    : "Aún no creaste flujos",
                  description: hasActiveFilters
                    ? "Prueba con otros filtros o restablece la búsqueda para ver todos tus flujos."
                    : "Diseña tu primer flujo para automatizar respuestas y continuar las conversaciones de tus campañas.",
                  action: (
                    <Button
                      type="button"
                      onClick={handleCreateNewFlow}
                      className="bg-[#8694ff] text-white hover:bg-indigo-700"
                    >
                      <Plus className="mr-2 h-4 w-4" /> Crear flujo
                    </Button>
                  ),
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FlowsPage;
