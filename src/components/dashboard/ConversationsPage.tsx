"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
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
import ConversationTimeline from "@/components/dashboard/conversations/ConversationTimeline";
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
import { formatRelativeTime } from "@/lib/conversations/formatters";
import type { ConversationSummary } from "@/lib/conversations/types";

const ConversationsPage: React.FC = () => {
  const hasLoadedPreferencesRef = useRef(false);
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
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (hasLoadedPreferencesRef.current) {
      return;
    }

    try {
      const raw = window.localStorage.getItem(
        "finnegans.conversations.preferences",
      );

      if (!raw) {
        hasLoadedPreferencesRef.current = true;
        return;
      }

      const parsed = JSON.parse(raw) as Partial<{
        searchTerm: string;
        showUnreadOnly: boolean;
        selectedFlowIds: string[];
        sortOption: "recent" | "oldest" | "alphabetical";
        isAutoRefreshEnabled: boolean;
        selectedConversationId: string | null;
      }>;

      if (typeof parsed.searchTerm === "string") {
        setSearchTerm(parsed.searchTerm);
      }

      if (typeof parsed.showUnreadOnly === "boolean") {
        setShowUnreadOnly(parsed.showUnreadOnly);
      }

      if (Array.isArray(parsed.selectedFlowIds)) {
        setSelectedFlowIds(
          parsed.selectedFlowIds.filter((value): value is string =>
            typeof value === "string",
          ),
        );
      }

      if (
        parsed.sortOption === "recent" ||
        parsed.sortOption === "oldest" ||
        parsed.sortOption === "alphabetical"
      ) {
        setSortOption(parsed.sortOption);
      }

      if (typeof parsed.isAutoRefreshEnabled === "boolean") {
        setIsAutoRefreshEnabled(parsed.isAutoRefreshEnabled);
      }

      if (
        parsed.selectedConversationId === null ||
        typeof parsed.selectedConversationId === "string"
      ) {
        setSelectedConversationId(parsed.selectedConversationId ?? null);
      }
    } catch (error) {
      console.error(
        "No se pudieron cargar las preferencias de conversaciones",
        error,
      );
    } finally {
      hasLoadedPreferencesRef.current = true;
    }
  }, []);

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
        setLastUpdatedAt(new Date());
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
    if (!hasLoadedPreferencesRef.current) {
      return;
    }

    const payload = {
      searchTerm,
      showUnreadOnly,
      selectedFlowIds,
      sortOption,
      isAutoRefreshEnabled,
      selectedConversationId,
    };

    try {
      window.localStorage.setItem(
        "finnegans.conversations.preferences",
        JSON.stringify(payload),
      );
    } catch (error) {
      console.error(
        "No se pudieron guardar las preferencias de conversaciones",
        error,
      );
    }
  }, [
    isAutoRefreshEnabled,
    searchTerm,
    selectedConversationId,
    selectedFlowIds,
    showUnreadOnly,
    sortOption,
  ]);

  useEffect(() => {
    void fetchConversations("initial");
  }, [fetchConversations]);

  useEffect(() => {
    if (!isAutoRefreshEnabled) {
      return;
    }

    void fetchConversations("refresh");

    const AUTO_REFRESH_INTERVAL_MS = 60_000;
    const intervalId = window.setInterval(() => {
      void fetchConversations("refresh");
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchConversations, isAutoRefreshEnabled]);

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

  const handleSelectConversationByOffset = useCallback(
    (offset: number) => {
      if (!filteredConversations.length) {
        return;
      }

      const currentIndex = filteredConversations.findIndex(
        (item) => item.contactId === selectedConversationId,
      );

      const nextIndex = Math.min(
        filteredConversations.length - 1,
        Math.max(0, currentIndex === -1 ? 0 : currentIndex + offset),
      );

      const nextConversation = filteredConversations[nextIndex];
      if (nextConversation) {
        setSelectedConversationId(nextConversation.contactId);
      }
    },
    [filteredConversations, selectedConversationId],
  );

  const handleRefresh = useCallback(() => {
    void fetchConversations("refresh");
  }, [fetchConversations]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setShowUnreadOnly(false);
    setSelectedFlowIds([]);
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

  const autoRefreshStatusLabel = useMemo(() => {
    if (loading) {
      return "Cargando...";
    }
    if (isRefreshing) {
      return "Actualizando...";
    }
    if (!lastUpdatedAt) {
      return "Sin actualizaciones recientes";
    }
    return `Actualizado ${formatRelativeTime(lastUpdatedAt.toISOString())}`;
  }, [isRefreshing, lastUpdatedAt, loading]);

  const keyboardShortcuts = useMemo(
    () => [
      {
        keys: ["/"],
        description: "Buscar conversaciones",
      },
      {
        keys: ["Alt", "Flecha ↓"],
        description: "Seleccionar la siguiente conversación",
      },
      {
        keys: ["Alt", "Flecha ↑"],
        description: "Seleccionar la conversación anterior",
      },
      {
        keys: ["Alt", "R"],
        description: "Actualizar listado",
      },
      {
        keys: ["Alt", "U"],
        description: "Alternar filtro de no leídos",
      },
      {
        keys: ["Alt", "A"],
        description: "Alternar auto actualización",
      },
    ],
    [],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName ?? "";
      const isTypingElement =
        target?.isContentEditable ||
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT";

      if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (isTypingElement) {
          return;
        }
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if ((event.key === "ArrowDown" || event.key === "ArrowUp") && event.altKey) {
        if (isTypingElement) {
          return;
        }
        event.preventDefault();
        handleSelectConversationByOffset(event.key === "ArrowDown" ? 1 : -1);
        return;
      }

      const normalizedKey = event.key.toLowerCase();

      if (normalizedKey === "r" && event.altKey) {
        event.preventDefault();
        handleRefresh();
        return;
      }

      if (normalizedKey === "u" && event.altKey) {
        event.preventDefault();
        setShowUnreadOnly((previous) => !previous);
        return;
      }

      if (normalizedKey === "a" && event.altKey) {
        event.preventDefault();
        setIsAutoRefreshEnabled((previous) => !previous);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleRefresh, handleSelectConversationByOffset]);

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
            <div
              key={conversation.contactId}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedConversationId(conversation.contactId)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedConversationId(conversation.contactId);
                }
              }}
              className={cn(
                "w-full rounded-2xl border p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#4bc3fe]",
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
                  <div className="flex items-start justify-between gap-2">
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
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-xs text-slate-500">
                    <div className="flex flex-wrap items-center gap-2">
                      {conversation.unreadCount > 0 ? (
                        <Badge variant="secondary">
                          {conversation.unreadCount} sin leer
                        </Badge>
                      ) : null}
                      {conversation.flows.map((flow) => (
                        <Badge key={flow.id} variant="outline">
                          {flow.name}
                        </Badge>
                      ))}
                    </div>
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={(event) => {
                          event.stopPropagation();
                          void (async () => {
                            try {
                              await navigator.clipboard.writeText(
                                conversation.contactPhone,
                              );
                              toast.success("Número copiado al portapapeles");
                            } catch (error) {
                              toast.error("No pudimos copiar el número");
                              console.error(error);
                            }
                          })();
                        }}
                      >
                        <Copy className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                        Copiar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          router.push(
                            `/dashboard/conversations/${conversation.contactId}`,
                          );
                        }}
                        className="whitespace-nowrap text-xs"
                      >
                        Abrir conversación
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Atajos de teclado
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Usa combinaciones rápidas para moverte más rápido entre conversaciones.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {keyboardShortcuts.map((shortcut) => (
            <div
              key={shortcut.description}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
            >
              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                {shortcut.keys.map((key, index) => (
                  <React.Fragment key={`${shortcut.description}-${key}-${index}`}>
                    <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-700">
                      {key}
                    </kbd>
                    {index < shortcut.keys.length - 1 ? (
                      <span className="text-slate-400">+</span>
                    ) : null}
                  </React.Fragment>
                ))}
              </span>
              <span>{shortcut.description}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid h-[calc(100vh-13rem)] gap-6 lg:grid-cols-[380px_1fr]">
        <div className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
          <div className="space-y-3 border-b border-slate-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                ref={searchInputRef}
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
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs">
                <Switch
                  id="auto-refresh-switch"
                  checked={isAutoRefreshEnabled}
                  onCheckedChange={(checked) => setIsAutoRefreshEnabled(Boolean(checked))}
                />
                <div className="flex flex-col leading-tight">
                  <Label
                    htmlFor="auto-refresh-switch"
                    className="cursor-pointer text-xs font-medium text-slate-600"
                  >
                    Auto actualizar
                  </Label>
                  <span className="text-[11px] text-slate-400">Cada 60 segundos</span>
                </div>
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
              <div className="ml-auto flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{autoRefreshStatusLabel}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="gap-2 text-xs"
                >
                  <Filter className="h-4 w-4" aria-hidden="true" />
                  Limpiar filtros
                </Button>
              </div>
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
                <ConversationTimeline
                  messages={selectedConversation.messages}
                />
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
                <ConversationTimeline
                  messages={selectedConversation.messages}
                />
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
