"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowLeft,
  Clock3,
  Copy,
  Download,
  Filter,
  Loader2,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  SortDesc,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/dashboard/PageHeader";
import FilterMultiSelect from "@/components/dashboard/FilterMultiSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  UnauthorizedError,
  authenticatedFetch,
} from "@/lib/api-client";

interface ConversationMessage {
  id: string;
  direction: "in" | "out" | "system";
  type: string;
  text: string;
  timestamp: string;
  metadata: string[];
}

interface ConversationSummary {
  contactId: string;
  contactName: string | null;
  contactPhone: string;
  flows: Array<{ id: string; name: string }>;
  lastActivity: string;
  lastMessage: string;
  unreadCount: number;
  messages: ConversationMessage[];
}

const relativeTimeFormatter = new Intl.RelativeTimeFormat("es-AR", {
  numeric: "auto",
});

const absoluteTimeFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
});

const messageDayFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "full",
});

function formatRelativeTime(value: string): string {
  const target = new Date(value);
  const now = new Date();
  if (Number.isNaN(target.getTime())) {
    return "hace un momento";
  }
  const diffMs = target.getTime() - now.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  const ranges: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.34524, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];

  let unit: Intl.RelativeTimeFormatUnit = "second";
  let valueToFormat = diffSeconds;

  for (const [step, nextUnit] of ranges) {
    if (Math.abs(valueToFormat) < step) {
      unit = nextUnit;
      break;
    }
    valueToFormat /= step;
  }

  const rounded = Math.round(valueToFormat);
  if (!Number.isFinite(rounded)) {
    return "hace un momento";
  }

  return relativeTimeFormatter.format(rounded, unit);
}

const ConversationsPage: React.FC = () => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedFlowIds, setSelectedFlowIds] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<
    "recent" | "oldest" | "alphabetical"
  >("recent");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    null,
  );

  const fetchConversations = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "initial") {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const response = await authenticatedFetch("/api/conversations");
        const payload = (await response
          .json()
          .catch(() => null)) as
          | { error?: string; conversations?: ConversationSummary[] }
          | null;

        if (!response.ok || !payload) {
          throw new Error(
            payload?.error ?? "No se pudieron obtener las conversaciones",
          );
        }

        setConversations(payload.conversations ?? []);
        setErrorMessage(null);
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          return;
        }
        const message =
          (error as Error)?.message ?? "Error al obtener las conversaciones";
        setErrorMessage(message);
        toast.error(message);
      } finally {
        if (mode === "initial") {
          setLoading(false);
        } else {
          setIsRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void fetchConversations("initial");
  }, [fetchConversations]);

  useEffect(() => {
    if (!loading && conversations.length > 0) {
      setSelectedConversationId((previous) => {
        if (previous && conversations.some((item) => item.contactId === previous)) {
          return previous;
        }
        return conversations[0]?.contactId ?? null;
      });
    }
    if (!loading && conversations.length === 0) {
      setSelectedConversationId(null);
    }
  }, [conversations, loading]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const flowOptions = useMemo(() => {
    const registry = new Map<string, string>();
    conversations.forEach((conversation) => {
      conversation.flows.forEach((flow) => {
        if (!registry.has(flow.id)) {
          registry.set(flow.id, flow.name);
        }
      });
    });
    return Array.from(registry.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    const matchesSearch = (conversation: ConversationSummary) => {
      if (!normalizedSearch) {
        return true;
      }
      const values = [
        conversation.contactName ?? "",
        conversation.contactPhone,
        conversation.lastMessage,
        ...conversation.flows.map((flow) => flow.name),
      ];
      return values.some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      );
    };

    const matchesUnread = (conversation: ConversationSummary) => {
      if (!showUnreadOnly) {
        return true;
      }
      return conversation.unreadCount > 0;
    };

    const matchesFlows = (conversation: ConversationSummary) => {
      if (!selectedFlowIds.length) {
        return true;
      }
      return conversation.flows.some((flow) =>
        selectedFlowIds.includes(flow.id),
      );
    };

    const filtered = conversations.filter(
      (conversation) =>
        matchesSearch(conversation) &&
        matchesUnread(conversation) &&
        matchesFlows(conversation),
    );

    const sorted = [...filtered].sort((first, second) => {
      if (sortOption === "alphabetical") {
        const firstLabel = (first.contactName ?? first.contactPhone).toLowerCase();
        const secondLabel = (second.contactName ?? second.contactPhone).toLowerCase();
        return firstLabel.localeCompare(secondLabel, "es");
      }

      const firstTime = new Date(first.lastActivity).getTime();
      const secondTime = new Date(second.lastActivity).getTime();

      if (Number.isNaN(firstTime) || Number.isNaN(secondTime)) {
        return 0;
      }

      return sortOption === "recent"
        ? secondTime - firstTime
        : firstTime - secondTime;
    });

    return sorted;
  }, [
    conversations,
    normalizedSearch,
    selectedFlowIds,
    showUnreadOnly,
    sortOption,
  ]);

  const selectedConversation = useMemo(() => {
    if (!filteredConversations.length) {
      return null;
    }

    if (selectedConversationId === null) {
      return null;
    }

    const match = filteredConversations.find(
      (item) => item.contactId === selectedConversationId,
    );

    return match ?? filteredConversations[0];
  }, [filteredConversations, selectedConversationId]);

  useEffect(() => {
    if (!filteredConversations.length) {
      return;
    }

    if (selectedConversationId === null) {
      return;
    }

    const exists = filteredConversations.some(
      (conversation) => conversation.contactId === selectedConversationId,
    );

    if (!exists) {
      setSelectedConversationId(filteredConversations[0].contactId);
    }
  }, [filteredConversations, selectedConversationId]);

  const totalUnreadCount = useMemo(
    () =>
      conversations.reduce(
        (counter, conversation) => counter + conversation.unreadCount,
        0,
      ),
    [conversations],
  );

  const distinctFlowCount = useMemo(() => {
    const unique = new Set<string>();
    conversations.forEach((conversation) => {
      conversation.flows.forEach((flow) => unique.add(flow.id));
    });
    return unique.size;
  }, [conversations]);

  const averageMessagesPerConversation = useMemo(() => {
    if (!conversations.length) {
      return 0;
    }
    const totalMessages = conversations.reduce(
      (counter, conversation) => counter + conversation.messages.length,
      0,
    );
    return Number((totalMessages / conversations.length).toFixed(1));
  }, [conversations]);

  const handleRefresh = () => {
    void fetchConversations("refresh");
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setShowUnreadOnly(false);
    setSelectedFlowIds([]);
  };

  const renderMessage = (message: ConversationMessage) => {
    const dateValue = new Date(message.timestamp);
    const timestamp = Number.isNaN(dateValue.getTime())
      ? "Fecha desconocida"
      : absoluteTimeFormatter.format(dateValue);
    const metadata = Array.from(new Set(message.metadata)).filter(Boolean);

    return (
      <div
        key={message.id}
        className={cn(
          "flex",
          message.direction === "out" && "justify-end",
          message.direction === "system" && "justify-center",
        )}
      >
        <div
          className={cn(
            "group relative max-w-[80%] rounded-2xl border px-4 py-3 text-sm shadow-sm transition-colors",
            message.direction === "in" &&
              "border-slate-200 bg-white text-slate-900",
            message.direction === "out" &&
              "border-transparent bg-[#04102D] text-white",
            message.direction === "system" &&
              "border-slate-200 bg-slate-100 text-slate-700",
          )}
        >
          <p className="whitespace-pre-wrap break-words leading-relaxed">
            {message.text}
          </p>
          {metadata.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-slate-500">
              {metadata.map((entry) => (
                <li key={entry} className="flex items-center gap-2">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span className="break-words text-left">{entry}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <span
            className={cn(
              "mt-2 block text-[0.65rem] uppercase tracking-wider",
              message.direction === "out" ? "text-white/70" : "text-slate-400",
            )}
          >
            {timestamp}
          </span>
        </div>
      </div>
    );
  };

  const renderMessages = (messages: ConversationMessage[]) => {
    if (!messages.length) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-500">
          <MessageCircle className="h-8 w-8 text-slate-400" aria-hidden="true" />
          <p className="text-sm">
            Aún no hay mensajes registrados en esta conversación.
          </p>
        </div>
      );
    }

    const sortedMessages = [...messages].sort((first, second) => {
      const firstTime = new Date(first.timestamp).getTime();
      const secondTime = new Date(second.timestamp).getTime();
      if (Number.isNaN(firstTime) || Number.isNaN(secondTime)) {
        return 0;
      }
      return firstTime - secondTime;
    });

    const groups = sortedMessages.reduce(
      (accumulator, message) => {
        const dateValue = new Date(message.timestamp);
        const key = Number.isNaN(dateValue.getTime())
          ? "Fecha desconocida"
          : messageDayFormatter.format(dateValue);
        const current = accumulator.get(key) ?? [];
        current.push(message);
        accumulator.set(key, current);
        return accumulator;
      },
      new Map<string, ConversationMessage[]>(),
    );

    return Array.from(groups.entries()).map(([label, entries]) => (
      <div key={label} className="space-y-3">
        <div className="sticky top-0 z-10 flex items-center justify-center">
          <span className="inline-flex items-center rounded-full bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-sm">
            {label}
          </span>
        </div>
        <div className="space-y-4">
          {entries.map((message) => renderMessage(message))}
        </div>
      </div>
    ));
  };

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.contactId === selectedConversationId
          ? { ...conversation, unreadCount: 0 }
          : conversation,
      ),
    );
  }, [selectedConversationId]);

  const selectedConversationLabel = selectedConversation
    ? selectedConversation.contactName ?? selectedConversation.contactPhone
    : null;

  const handleCopyPhone = useCallback(async () => {
    if (!selectedConversation) {
      return;
    }
    try {
      await navigator.clipboard.writeText(selectedConversation.contactPhone);
      toast.success("Número copiado al portapapeles");
    } catch (error) {
      toast.error("No pudimos copiar el número");
      console.error(error);
    }
  }, [selectedConversation]);

  const handleExportConversation = useCallback(() => {
    if (!selectedConversation) {
      return;
    }

    try {
      const exportPayload = {
        exportedAt: new Date().toISOString(),
        conversation: selectedConversation,
      };
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: "application/json",
      });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName =
        selectedConversationLabel?.replace(/[^a-z0-9_-]+/gi, "-") ?? "conversacion";
      link.href = objectUrl;
      link.download = `${safeName}-finnegans.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success("Descargamos el historial en formato JSON");
    } catch (error) {
      toast.error("No pudimos exportar la conversación");
      console.error(error);
    }
  }, [selectedConversation, selectedConversationLabel]);

  const renderConversationList = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (!filteredConversations.length) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-slate-500">
          <MessageCircle className="h-10 w-10 text-slate-400" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-700">
              {normalizedSearch
                ? "No encontramos conversaciones con ese criterio"
                : "Aún no hay conversaciones registradas"}
            </p>
            <p className="text-sm">
              {normalizedSearch
                ? "Prueba ajustando el término de búsqueda o limpiando los filtros."
                : "Las conversaciones aparecerán automáticamente cuando tus clientes interactúen con tus flujos."}
            </p>
          </div>
          {normalizedSearch || showUnreadOnly || selectedFlowIds.length ? (
            <Button variant="outline" onClick={handleClearFilters} className="gap-2">
              <Filter className="h-4 w-4" aria-hidden="true" />
              Limpiar búsqueda
            </Button>
          ) : null}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {filteredConversations.map((conversation) => {
          const isActive = conversation.contactId === selectedConversation?.contactId;
          const lastActivityLabel = formatRelativeTime(conversation.lastActivity);

          return (
            <button
              key={conversation.contactId}
              type="button"
              onClick={() => setSelectedConversationId(conversation.contactId)}
              className={cn(
                "w-full rounded-2xl border p-4 text-left transition-all",
                isActive
                  ? "border-[#4bc3fe] bg-[#e9f7ff] shadow-sm"
                  : "border-transparent bg-white hover:border-slate-200 hover:shadow-sm",
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#04102D] text-white">
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {conversation.contactName ?? conversation.contactPhone}
                      </p>
                      <p className="text-xs text-slate-500">
                        {conversation.contactName
                          ? conversation.contactPhone
                          : "Sin nombre registrado"}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">{lastActivityLabel}</span>
                  </div>
                  <p className="line-clamp-2 text-sm text-slate-600">
                    {conversation.lastMessage || "Sin mensajes disponibles"}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {conversation.flows.map((flow) => (
                      <Badge key={flow.id} variant="outline">
                        {flow.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                {conversation.unreadCount > 0 ? (
                  <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-[#04102D] px-2 text-xs font-semibold text-white">
                    {conversation.unreadCount}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col gap-6 p-6 pb-24">
      <PageHeader
        title="Conversaciones"
        description="Consulta y responde conversaciones activas sin salir del panel."
        actions={
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading || isRefreshing}
            className="gap-2"
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            )}
            Actualizar
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Conversaciones totales
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {conversations.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Incluyendo conversaciones históricas y activas.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Mensajes sin leer
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#04102D]">
            {totalUnreadCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Revisa primero los contactos con actividad reciente.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Flujos involucrados
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {distinctFlowCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Identifica qué flujos generan más conversaciones.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Promedio de mensajes
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {averageMessagesPerConversation}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Mensajes promedio por conversación.
          </p>
        </div>
      </div>

      <div className="grid h-[calc(100vh-13rem)] gap-6 lg:grid-cols-[380px_1fr]">
        <div className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
          <div className="space-y-3 border-b border-slate-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por nombre, teléfono o flujo"
                className="h-11 rounded-2xl border-slate-200 pl-10"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs">
                <Switch
                  id="unread-switch"
                  checked={showUnreadOnly}
                  onCheckedChange={(checked) => setShowUnreadOnly(Boolean(checked))}
                />
                <Label htmlFor="unread-switch" className="cursor-pointer text-xs font-medium text-slate-600">
                  Solo no leídos
                </Label>
              </div>
              <FilterMultiSelect
                label="Flujos"
                options={flowOptions}
                selectedValues={selectedFlowIds}
                onSelectionChange={setSelectedFlowIds}
                disabled={!flowOptions.length}
                className="rounded-2xl"
              />
              <Select
                value={sortOption}
                onValueChange={(value) => setSortOption(value as typeof sortOption)}
              >
                <SelectTrigger className="rounded-2xl border-slate-200 bg-white text-xs">
                  <SelectValue>
                    <span className="flex items-center gap-2">
                      <SortDesc className="h-4 w-4" aria-hidden="true" />
                      Orden: {sortOption === "recent"
                        ? "Más recientes"
                        : sortOption === "oldest"
                          ? "Más antiguos"
                          : "Alfabético"}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Más recientes primero</SelectItem>
                  <SelectItem value="oldest">Más antiguos primero</SelectItem>
                  <SelectItem value="alphabetical">Orden alfabético</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="ml-auto gap-2 text-xs"
              >
                <Filter className="h-4 w-4" aria-hidden="true" />
                Limpiar filtros
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {renderConversationList()}
          </div>
        </div>

        <div className="hidden rounded-3xl border border-slate-200 bg-white lg:flex lg:flex-col">
          {selectedConversation ? (
            <>
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#04102D] text-white">
                    <UserRound className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-900">
                        {selectedConversation.contactName ?? "Contacto sin nombre"}
                      </h2>
                      {selectedConversation.unreadCount > 0 ? (
                        <Badge variant="secondary">
                          {selectedConversation.unreadCount} mensaje
                          {selectedConversation.unreadCount > 1 ? "s" : ""} sin leer
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                        {selectedConversation.contactPhone}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatRelativeTime(selectedConversation.lastActivity)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {selectedConversation.flows.map((flow) => (
                        <Badge key={flow.id} variant="outline">
                          {flow.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleCopyPhone}
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    Copiar número
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleExportConversation}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Exportar JSON
                  </Button>
                </div>
              </div>
              <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50 p-6">
                {renderMessages(selectedConversation.messages)}
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-slate-500">
              <MessageCircle className="h-12 w-12 text-slate-400" aria-hidden="true" />
              <div className="space-y-1">
                <p className="text-lg font-semibold text-slate-700">
                  Selecciona una conversación
                </p>
                <p className="text-sm">
                  Explora la lista de la izquierda para revisar el historial completo con tus contactos.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col rounded-3xl border border-slate-200 bg-white lg:hidden">
          {selectedConversation ? (
            <>
              <div className="flex items-center gap-3 border-b border-slate-200 p-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setSelectedConversationId(null)}
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedConversation.contactName ?? selectedConversation.contactPhone}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatRelativeTime(selectedConversation.lastActivity)}
                  </p>
                </div>
              </div>
              <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50 p-4">
                {renderMessages(selectedConversation.messages)}
              </div>
              <div className="flex flex-col gap-2 border-t border-slate-200 p-4">
                <Button
                  variant="outline"
                  onClick={handleCopyPhone}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  Copiar número
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportConversation}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Exportar historial
                </Button>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-slate-500">
              <MessageCircle className="h-12 w-12 text-slate-400" aria-hidden="true" />
              <p className="text-sm">
                Selecciona una conversación desde la lista para revisar su historial.
              </p>
            </div>
          )}
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
};

export default ConversationsPage;
