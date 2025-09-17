"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { motion } from "framer-motion";
import {
  Megaphone,
  Users,
  Send,
  AlertTriangle,
  Loader2,
  Search,
  Filter,
  CheckCircle2,
  GitBranch,
  Clock,
  Phone,
  Plus,
} from "lucide-react";
import { containerVariants, itemVariants } from "@/lib/animations";
import MetricCard from "@/components/dashboard/MetricCard";
import Table from "@/components/dashboard/Table";
import { useAuthStore } from "@/lib/store";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

interface ContactTag {
  tag: { id: string; name: string };
}

interface ContactItem {
  id: string;
  name?: string | null;
  phone: string;
  tags?: ContactTag[];
}

interface BroadcastRecipient {
  id: string;
  status: string;
  error?: string | null;
  sentAt?: string | null;
  contact?: { id: string; name?: string | null; phone: string } | null;
  createdAt?: string;
}

interface BroadcastItem {
  id: string;
  title?: string | null;
  body: string;
  filterTag?: string | null;
  status: string;
  totalRecipients: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
  recipients: BroadcastRecipient[];
  flow?: { id: string; name?: string | null } | null;
  flowId?: string | null;
}

interface FlowOption {
  id: string;
  name: string;
  status?: string | null;
  trigger?: string | null;
  phoneNumber?: string | null;
  userId: string;
  updatedAt?: string;
  _count?: {
    broadcasts: number;
    sessions: number;
  };
}

const statusLabels: Record<string, string> = {
  Processing: "En proceso",
  Completed: "Completado",
  CompletedWithErrors: "Completado con errores",
  Failed: "Fallido",
  Sent: "Enviado",
  Pending: "Pendiente",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Processing: "secondary",
  Completed: "default",
  CompletedWithErrors: "secondary",
  Failed: "destructive",
  Sent: "default",
  Pending: "secondary",
};

const flowStatusLabels: Record<string, string> = {
  Active: "Activo",
  Draft: "Borrador",
  Inactive: "Inactivo",
};

const flowStatusVariants: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  Active: "default",
  Draft: "secondary",
  Inactive: "outline",
};

const BroadcastsPage = () => {
  const { user } = useAuthStore();
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingBroadcasts, setLoadingBroadcasts] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sendToAll, setSendToAll] = useState<boolean>(true);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [title, setTitle] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedBroadcastId, setSelectedBroadcastId] = useState<string | null>(
    null,
  );
  const [flows, setFlows] = useState<FlowOption[]>([]);
  const [loadingFlows, setLoadingFlows] = useState(false);
  const [selectedFlowId, setSelectedFlowId] = useState<string>("");

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat("es-AR", {
        maximumFractionDigits: 0,
      }),
    [],
  );

  const fetchContacts = useCallback(async () => {
    try {
      setLoadingContacts(true);
      const response = await fetch("/api/contacts");
      if (!response.ok) {
        throw new Error("No se pudieron cargar los contactos");
      }
      const data = await response.json();
      setContacts(data);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar los contactos");
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  const fetchBroadcasts = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoadingBroadcasts(true);
      const response = await fetch(`/api/broadcasts?userId=${user.id}`);
      if (!response.ok) {
        throw new Error("No se pudieron obtener las campañas");
      }
      const data = await response.json();
      setBroadcasts(data);
      setSelectedBroadcastId((current) => current ?? data?.[0]?.id ?? null);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar las campañas masivas");
    } finally {
      setLoadingBroadcasts(false);
    }
  }, [user?.id]);

  const fetchFlows = useCallback(async () => {
    if (!user?.id) {
      setFlows([]);
      setSelectedFlowId("");
      return;
    }

    try {
      setLoadingFlows(true);
      const response = await fetch(`/api/flows?userId=${user.id}`);
      if (!response.ok) {
        throw new Error("No se pudieron cargar los flujos");
      }
      const data: FlowOption[] = await response.json();
      const filtered = data.filter((flow) => flow.userId === user.id);
      const sorted = filtered.sort((a, b) => {
        const aActive = a.status === "Active";
        const bActive = b.status === "Active";
        if (aActive !== bActive) {
          return aActive ? -1 : 1;
        }
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTime - aTime;
      });
      setFlows(sorted);
      setSelectedFlowId((current) =>
        current && sorted.some((flow) => flow.id === current)
          ? current
          : sorted[0]?.id ?? "",
      );
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar los flujos");
      setFlows([]);
      setSelectedFlowId("");
    } finally {
      setLoadingFlows(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setContacts([]);
      setBroadcasts([]);
      setFlows([]);
      setSelectedFlowId("");
      return;
    }
    fetchContacts();
    fetchBroadcasts();
    fetchFlows();
  }, [
    fetchBroadcasts,
    fetchContacts,
    fetchFlows,
    user?.id,
  ]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach((contact) => {
      contact.tags?.forEach((tagRelation) => {
        if (tagRelation?.tag?.name) {
          set.add(tagRelation.tag.name);
        }
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    const byTag =
      selectedTag === "all"
        ? contacts
        : contacts.filter((contact) =>
            contact.tags?.some((tagRelation) => tagRelation.tag.name === selectedTag),
          );

    if (!searchTerm.trim()) {
      return byTag;
    }

    const term = searchTerm.toLowerCase();
    return byTag.filter((contact) => {
      const name = contact.name?.toLowerCase() ?? "";
      const phone = contact.phone?.toLowerCase() ?? "";
      return name.includes(term) || phone.includes(term);
    });
  }, [contacts, selectedTag, searchTerm]);

  const filteredContactIds = useMemo(
    () => new Set(filteredContacts.map((contact) => contact.id)),
    [filteredContacts],
  );

  useEffect(() => {
    setSelectedContacts((prev) =>
      prev.filter((contactId) => filteredContactIds.has(contactId)),
    );
  }, [filteredContactIds]);

  const metrics = useMemo(() => {
    const totalCampaigns = broadcasts.length;
    const totalRecipients = broadcasts.reduce(
      (acc, campaign) => acc + (campaign.totalRecipients ?? 0),
      0,
    );
    const totalSuccess = broadcasts.reduce(
      (acc, campaign) => acc + (campaign.successCount ?? 0),
      0,
    );
    const totalFailures = broadcasts.reduce(
      (acc, campaign) => acc + (campaign.failureCount ?? 0),
      0,
    );
    const averageRecipients = totalCampaigns
      ? Math.round(totalRecipients / totalCampaigns)
      : 0;
    const lastCampaign = broadcasts[0];

    return [
      {
        title: "Campañas masivas",
        value: numberFormatter.format(totalCampaigns),
        change: lastCampaign
          ? `Última campaña: ${new Date(lastCampaign.createdAt).toLocaleString()}`
          : "Aún no enviaste campañas",
        icon: Megaphone,
      },
      {
        title: "Destinatarios alcanzados",
        value: numberFormatter.format(totalRecipients),
        change: totalCampaigns
          ? `Promedio de ${numberFormatter.format(averageRecipients)} por campaña`
          : "Importa tu base de contactos",
        icon: Users,
      },
      {
        title: "Mensajes entregados",
        value: numberFormatter.format(totalSuccess),
        change:
          totalFailures > 0
            ? `${numberFormatter.format(totalFailures)} pendientes de revisión`
            : "Sin errores reportados",
        icon: Send,
      },
      {
        title: "Intentos fallidos",
        value: numberFormatter.format(totalFailures),
        change:
          totalFailures > 0
            ? "Revisa los detalles para reenviar"
            : "Todo en orden",
        icon: AlertTriangle,
      },
    ];
  }, [broadcasts, numberFormatter]);

  const columns = useMemo(
    () => [
      {
        key: "title",
        label: "Campaña",
        render: (row: BroadcastItem) => (
          <div className="space-y-1">
            <p className="font-semibold text-gray-800">
              {row.title || "Sin título"}
            </p>
            <p className="text-xs text-gray-500 max-w-[320px] truncate">
              {row.body}
            </p>
          </div>
        ),
      },
      {
        key: "flow",
        label: "Flujo",
        render: (row: BroadcastItem) => row.flow?.name || "Sin flujo",
      },
      {
        key: "createdAt",
        label: "Creada",
        render: (row: BroadcastItem) =>
          new Date(row.createdAt).toLocaleString(),
      },
      { key: "totalRecipients", label: "Destinatarios" },
      { key: "successCount", label: "Enviados" },
      { key: "failureCount", label: "Errores" },
      {
        key: "status",
        label: "Estado",
        render: (row: BroadcastItem) => (
          <Badge variant={statusVariants[row.status] ?? "secondary"}>
            {statusLabels[row.status] ?? row.status}
          </Badge>
        ),
      },
      {
        key: "actions",
        label: "Acciones",
        render: (row: BroadcastItem) => (
          <button
            onClick={() => setSelectedBroadcastId(row.id)}
            className="text-[#4bc3fe] hover:text-indigo-900 font-medium"
          >
            Ver detalle
          </button>
        ),
      },
    ],
    [],
  );

  const selectedBroadcast = useMemo(
    () => broadcasts.find((item) => item.id === selectedBroadcastId) ?? null,
    [broadcasts, selectedBroadcastId],
  );

  const handleToggleContact = (contactId: string) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId],
    );
  };

  const handleSelectAll = () => {
    setSelectedContacts(filteredContacts.map((contact) => contact.id));
  };

  const handleClearSelection = () => {
    setSelectedContacts([]);
  };

  const canSubmit = useMemo(() => {
    if (!message.trim() || !user?.id || !selectedFlowId) return false;
    if (sendToAll) {
      return filteredContacts.length > 0;
    }
    return selectedContacts.length > 0;
  }, [
    filteredContacts.length,
    message,
    selectedContacts.length,
    sendToAll,
    selectedFlowId,
    user?.id,
  ]);

  const selectedFlow = useMemo(
    () => flows.find((flow) => flow.id === selectedFlowId) ?? null,
    [flows, selectedFlowId],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.id) {
      toast.error("No se pudo determinar el usuario activo");
      return;
    }

    if (!canSubmit) {
      toast.error("Configura el mensaje y destinatarios antes de enviar");
      return;
    }

    if (!selectedFlowId) {
      toast.error("Selecciona un flujo para adjuntar la campaña");
      return;
    }

    try {
      setIsSubmitting(true);
      if (
        selectedFlow?.status &&
        selectedFlow.status !== "Active" &&
        flowStatusLabels[selectedFlow.status]
      ) {
        toast.message(
          `El flujo seleccionado está en estado ${
            flowStatusLabels[selectedFlow.status]
          }. Recuerda activarlo para continuar la conversación automáticamente.`,
        );
      }
      const response = await fetch("/api/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          title: title.trim() || null,
          message,
          sendToAll,
          contactIds: sendToAll ? undefined : selectedContacts,
          filterTag: selectedTag !== "all" ? selectedTag : null,
          flowId: selectedFlowId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "No se pudo enviar la campaña");
      }

      const broadcast = await response.json();
      toast.success("Campaña enviada correctamente");
      setBroadcasts((prev) => [broadcast, ...prev.filter((b) => b.id !== broadcast.id)]);
      setSelectedBroadcastId(broadcast.id);
      setMessage("");
      setTitle("");
      setSelectedContacts([]);
      setSendToAll(true);
      await fetchBroadcasts();
    } catch (error) {
      console.error(error);
      toast.error((error as Error)?.message ?? "No se pudo enviar la campaña");
    } finally {
      setIsSubmitting(false);
    }
  };

  const exampleCurl = useMemo(() => {
    const payload = {
      userId: "USER_ID",
      title: "Campaña de bienvenida",
      message: "Hola! Te damos la bienvenida a nuestra comunidad",
      sendToAll: true,
      filterTag: "Clientes",
      flowId: "FLOW_ID",
    };

    return `curl -X POST https://tu-dominio.com/api/broadcasts \\n  -H "Content-Type: application/json" \\n  -d '${JSON.stringify(payload, null, 2)}'`;
  }, []);

  return (
    <div className="p-6 space-y-6">
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </motion.div>

      <motion.div
        className="grid grid-cols-1 xl:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={itemVariants}
          className="bg-white p-6 rounded-lg shadow-md xl:col-span-2"
        >
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="title">Nombre interno</Label>
              <Input
                id="title"
                value={title}
                placeholder="Promoción de primavera"
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label>Flujo asociado</Label>
              {loadingFlows && flows.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando flujos disponibles...
                </div>
              ) : flows.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                  <p className="font-medium text-gray-700">
                    Aún no tienes flujos configurados.
                  </p>
                  <p className="mt-1">
                    Crea un flujo en el constructor para automatizar la
                    conversación luego del mensaje masivo.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full sm:w-auto"
                    onClick={() => router.push("/dashboard/flows")}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Crear mi primer flujo
                  </Button>
                </div>
              ) : (
                <>
                  <Select
                    value={selectedFlowId}
                    onValueChange={(value) => setSelectedFlowId(value)}
                    disabled={loadingFlows}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          loadingFlows
                            ? "Cargando flujos..."
                            : "Selecciona un flujo para continuar"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {flows.map((flow) => {
                        const updatedLabel = flow.updatedAt
                          ? new Date(flow.updatedAt).toLocaleDateString("es-AR", {
                              day: "2-digit",
                              month: "short",
                            })
                          : null;
                        return (
                          <SelectItem key={flow.id} value={flow.id} className="py-2">
                            <div className="flex flex-col text-left">
                              <span className="text-sm font-medium text-gray-800">
                                {flow.name}
                              </span>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                <Badge
                                  variant={
                                    flowStatusVariants[flow.status ?? ""] ?? "secondary"
                                  }
                                  className="px-2 py-0.5 text-[10px] uppercase tracking-wide"
                                >
                                  {flowStatusLabels[flow.status ?? ""] ??
                                    flow.status ??
                                    "Sin estado"}
                                </Badge>
                                {flow.trigger && (
                                  <span className="flex items-center gap-1">
                                    <GitBranch className="h-3 w-3" />
                                    {flow.trigger}
                                  </span>
                                )}
                                {updatedLabel && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> Actualizado {updatedLabel}
                                  </span>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Asocia la campaña a un flujo creado en el constructor para
                    continuar la conversación automáticamente.
                  </p>
                  {selectedFlow && (
                    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                            <GitBranch className="h-4 w-4 text-[#4bc3fe]" />
                            {selectedFlow.name}
                          </p>
                          {selectedFlow.updatedAt && (
                            <p className="text-xs text-gray-500">
                              Actualizado el
                              {" "}
                              {new Date(selectedFlow.updatedAt).toLocaleString("es-AR", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={
                            flowStatusVariants[selectedFlow.status ?? ""] ?? "secondary"
                          }
                          className="whitespace-nowrap"
                        >
                          {flowStatusLabels[selectedFlow.status ?? ""] ??
                            selectedFlow.status ??
                            "Sin estado"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 gap-3 text-gray-700 sm:grid-cols-2">
                        <div className="rounded-md border border-gray-200 bg-white p-3">
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            Palabra clave
                          </p>
                          <p className="mt-1 flex items-center gap-2 font-medium text-gray-800">
                            <GitBranch className="h-4 w-4 text-[#4bc3fe]" />
                            {selectedFlow.trigger || "Sin definir"}
                          </p>
                        </div>
                        <div className="rounded-md border border-gray-200 bg-white p-3">
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            Número asignado
                          </p>
                          <p className="mt-1 flex items-center gap-2 font-medium text-gray-800">
                            <Phone className="h-4 w-4 text-[#4bc3fe]" />
                            {selectedFlow.phoneNumber || "Sin número"}
                          </p>
                        </div>
                        <div className="rounded-md border border-gray-200 bg-white p-3">
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            Campañas masivas
                          </p>
                          <p className="mt-1 font-medium text-gray-800">
                            {numberFormatter.format(
                              selectedFlow._count?.broadcasts ?? 0,
                            )}
                          </p>
                        </div>
                        <div className="rounded-md border border-gray-200 bg-white p-3">
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            Sesiones activas
                          </p>
                          <p className="mt-1 font-medium text-gray-800">
                            {numberFormatter.format(selectedFlow._count?.sessions ?? 0)}
                          </p>
                        </div>
                      </div>
                      {selectedFlow.status && selectedFlow.status !== "Active" && (
                        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                          <AlertTriangle className="mt-0.5 h-4 w-4" />
                          <span>
                            Este flujo está marcado como
                            {" "}
                            {flowStatusLabels[selectedFlow.status] ?? selectedFlow.status}.
                            Actívalo para continuar automáticamente la
                            conversación luego del envío masivo.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="message">Mensaje a enviar</Label>
                <span className="text-xs text-gray-500">
                  {message.length} caracteres
                </span>
              </div>
              <Textarea
                id="message"
                value={message}
                rows={6}
                placeholder="Escribe el texto que recibirán tus contactos. Puedes personalizarlo luego con plantillas."
                onChange={(event) => setMessage(event.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Segmento</Label>
                <Select
                  value={selectedTag}
                  onValueChange={(value) => setSelectedTag(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos los contactos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los contactos</SelectItem>
                    {tags.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="search">Buscar contacto</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Nombre o teléfono"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={sendToAll}
                    onCheckedChange={(checked) => setSendToAll(checked)}
                    id="send-to-all"
                  />
                  <div>
                    <Label htmlFor="send-to-all" className="font-medium">
                      Enviar a todo el segmento filtrado
                    </Label>
                    <p className="text-xs text-gray-500">
                      Incluye {filteredContacts.length} contactos coincidentes
                    </p>
                  </div>
                </div>
                {!sendToAll && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Filter className="h-4 w-4" />
                    <span>
                      {selectedContacts.length} seleccionados de {filteredContacts.length}
                    </span>
                  </div>
                )}
              </div>

              {!sendToAll && (
                <div className="border rounded-lg p-4 space-y-3 max-h-72 overflow-y-auto">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      Selecciona contactos individuales
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAll}
                      >
                        Seleccionar todos
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClearSelection}
                      >
                        Limpiar
                      </Button>
                    </div>
                  </div>
                  {loadingContacts ? (
                    <div className="flex items-center justify-center py-10 text-gray-500">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Cargando contactos...
                    </div>
                  ) : filteredContacts.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No hay contactos para el filtro seleccionado.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredContacts.map((contact) => {
                        const checked = selectedContacts.includes(contact.id);
                        return (
                          <label
                            key={contact.id}
                            className={`border rounded-lg px-3 py-2 flex items-start gap-3 cursor-pointer transition ${
                              checked
                                ? "border-[#4bc3fe] bg-[#e6f7ff]"
                                : "hover:border-gray-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggleContact(contact.id)}
                              className="mt-1 h-4 w-4 text-[#4bc3fe] focus:ring-[#4bc3fe]"
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-800">
                                {contact.name || contact.phone}
                              </p>
                              <p className="text-xs text-gray-500">{contact.phone}</p>
                              {contact.tags && contact.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {contact.tags.map((tagRelation) => (
                                    <Badge key={tagRelation.tag.id} variant="outline">
                                      {tagRelation.tag.name}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                type="submit"
                className="bg-[#8694ff] text-white"
                disabled={isSubmitting || !canSubmit}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="h-4 w-4" /> Enviar campaña
                  </span>
                )}
              </Button>
            </div>
          </form>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-white p-6 rounded-lg shadow-md space-y-4"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-[#4bc3fe]" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                API de Mensajes Masivos
              </h3>
              <p className="text-sm text-gray-500">
                Automatiza el envío desde tus sistemas usando nuestra API REST.
              </p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              Envía un POST a <code className="font-mono">/api/broadcasts</code> con el
              contenido de tu campaña y la segmentación deseada.
            </p>
            <p>
              Recuerda incluir el <code className="font-mono">flowId</code> del chatbot que
              debe continuar la conversación luego del mensaje masivo.
            </p>
            <p>
              Puedes programar tus envíos y reutilizar plantillas desde tus flujos para
              mantener una comunicación consistente.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
              Ejemplo de petición
            </p>
            <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
{exampleCurl}
            </pre>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 xl:grid-cols-3 gap-6"
      >
        <motion.div variants={itemVariants} className="bg-white rounded-lg shadow-md xl:col-span-2">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Historial de campañas</h3>
              <p className="text-sm text-gray-500">
                Consulta el desempeño de tus envíos masivos.
              </p>
            </div>
            {loadingBroadcasts && (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>
          <div className="p-6">
            <Table columns={columns} data={broadcasts} />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800">
              Detalle del envío
            </h3>
            <p className="text-sm text-gray-500">
              Revisa los destinatarios y estados de entrega.
            </p>
          </div>
          <div className="p-6 space-y-4">
            {selectedBroadcast ? (
              <>
                <div className="space-y-1">
                  <h4 className="text-base font-semibold text-gray-800">
                    {selectedBroadcast.title || "Sin título"}
                  </h4>
                  <Badge variant={statusVariants[selectedBroadcast.status] ?? "secondary"}>
                    {statusLabels[selectedBroadcast.status] ?? selectedBroadcast.status}
                  </Badge>
                  <p className="text-xs text-gray-500">
                    Enviada el {new Date(selectedBroadcast.createdAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    Flujo asociado:
                    <span className="font-medium text-gray-700">
                      {" "}
                      {selectedBroadcast.flow?.name ?? "Sin flujo"}
                    </span>
                  </p>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap border border-dashed border-gray-200 rounded-lg p-3">
                  {selectedBroadcast.body}
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-indigo-50 text-indigo-900 rounded-lg p-3">
                    <p className="text-xs uppercase tracking-wide">Destinatarios</p>
                    <p className="text-lg font-semibold">
                      {numberFormatter.format(selectedBroadcast.totalRecipients)}
                    </p>
                  </div>
                  <div className="bg-green-50 text-green-900 rounded-lg p-3">
                    <p className="text-xs uppercase tracking-wide">Enviados</p>
                    <p className="text-lg font-semibold">
                      {numberFormatter.format(selectedBroadcast.successCount)}
                    </p>
                  </div>
                  <div className="bg-yellow-50 text-yellow-900 rounded-lg p-3">
                    <p className="text-xs uppercase tracking-wide">Pendientes</p>
                    <p className="text-lg font-semibold">
                      {numberFormatter.format(
                        selectedBroadcast.totalRecipients -
                          selectedBroadcast.successCount -
                          selectedBroadcast.failureCount,
                      )}
                    </p>
                  </div>
                  <div className="bg-red-50 text-red-900 rounded-lg p-3">
                    <p className="text-xs uppercase tracking-wide">Errores</p>
                    <p className="text-lg font-semibold">
                      {numberFormatter.format(selectedBroadcast.failureCount)}
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Destinatarios ({selectedBroadcast.recipients.length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {selectedBroadcast.recipients.map((recipient) => (
                      <div
                        key={recipient.id}
                        className="flex items-center justify-between border rounded-lg px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {recipient.contact?.name || recipient.contact?.phone}
                          </p>
                          <p className="text-xs text-gray-500">
                            {recipient.contact?.phone}
                          </p>
                        </div>
                        <Badge
                          variant={statusVariants[recipient.status] ?? "secondary"}
                          className="whitespace-nowrap"
                        >
                          {statusLabels[recipient.status] ?? recipient.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">
                Selecciona una campaña en el historial para ver los detalles.
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default BroadcastsPage;
