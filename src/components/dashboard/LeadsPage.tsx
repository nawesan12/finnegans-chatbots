"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Download, Loader2, NotebookPen, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/dashboard/PageHeader";
import Table, { type TableColumn } from "@/components/dashboard/Table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { leadStatuses, type LeadStatus } from "@/lib/leads";
import { authenticatedFetch, UnauthorizedError } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const statusBadgeClasses: Record<LeadStatus, string> = {
  new: "border-sky-200 bg-sky-50 text-sky-800",
  contacted: "border-amber-200 bg-amber-50 text-amber-800",
  qualified: "border-emerald-200 bg-emerald-50 text-emerald-700",
  archived: "border-slate-200 bg-slate-50 text-slate-600",
};

const leadStatusMap = new Map(
  leadStatuses.map((status) => [status.value, status]),
);

const DEFAULT_BADGE_CLASS = "border-gray-200 bg-gray-50 text-gray-600";

type StatusAccent = {
  container: string;
  label: string;
  value: string;
  muted: string;
  progress: string;
  track: string;
};

const defaultStatusAccent: StatusAccent = {
  container: "border-gray-200 bg-white",
  label: "text-gray-500",
  value: "text-gray-900",
  muted: "text-gray-600",
  progress: "bg-gray-400",
  track: "bg-gray-100",
};

const statusCardAccents: Record<LeadStatus, StatusAccent> = {
  new: {
    container: "border-sky-100 bg-sky-50",
    label: "text-sky-600",
    value: "text-sky-900",
    muted: "text-sky-700",
    progress: "bg-sky-400",
    track: "bg-white/60",
  },
  contacted: {
    container: "border-amber-100 bg-amber-50",
    label: "text-amber-600",
    value: "text-amber-900",
    muted: "text-amber-700",
    progress: "bg-amber-400",
    track: "bg-white/60",
  },
  qualified: {
    container: "border-emerald-100 bg-emerald-50",
    label: "text-emerald-600",
    value: "text-emerald-900",
    muted: "text-emerald-700",
    progress: "bg-emerald-400",
    track: "bg-white/60",
  },
  archived: {
    container: "border-slate-200 bg-slate-50",
    label: "text-slate-500",
    value: "text-slate-800",
    muted: "text-slate-600",
    progress: "bg-slate-400",
    track: "bg-white/60",
  },
};

async function parseErrorMessage(response: Response) {
  try {
    const data = await response.json();
    if (typeof data?.error === "string") {
      return data.error;
    }
  } catch (error) {
    console.error("Failed to parse error response", error);
  }
  return null;
}

function parseLeadSummary(data: unknown): LeadSummaryResponse | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const rawTotal = (data as { total?: unknown }).total;
  const rawByStatus = (data as { byStatus?: unknown }).byStatus;

  if (typeof rawTotal !== "number" || !Array.isArray(rawByStatus)) {
    return null;
  }

  const byStatus: LeadSummaryResponse["byStatus"] = rawByStatus
    .map((item) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }
      const status = (item as { status?: unknown }).status;
      const count = (item as { count?: unknown }).count;
      if (typeof status !== "string" || typeof count !== "number") {
        return null;
      }
      return { status, count };
    })
    .filter((value): value is { status: string; count: number } => Boolean(value));

  return {
    total: rawTotal,
    byStatus,
  };
}

function computeSummaryFromLeads(leads: LeadRecord[]): LeadSummaryResponse {
  const counts = new Map<string, number>();
  for (const lead of leads) {
    counts.set(lead.status, (counts.get(lead.status) ?? 0) + 1);
  }

  return {
    total: leads.length,
    byStatus: Array.from(counts.entries()).map(([status, count]) => ({
      status,
      count,
    })),
  };
}

function mergeSummaries(
  primary: LeadSummaryResponse,
  fallback: LeadSummaryResponse,
): LeadSummaryResponse {
  const counts = new Map<string, number>();

  for (const item of fallback.byStatus) {
    counts.set(item.status, item.count);
  }

  for (const item of primary.byStatus) {
    const current = counts.get(item.status) ?? 0;
    counts.set(item.status, Math.max(current, item.count));
  }

  return {
    total: Math.max(primary.total, fallback.total),
    byStatus: Array.from(counts.entries()).map(([status, count]) => ({
      status,
      count,
    })),
  };
}

function getStatusMeta(status: string) {
  const base = leadStatusMap.get(status as LeadStatus);
  if (base) {
    return {
      label: base.label,
      description: base.description,
      badgeClass: statusBadgeClasses[base.value],
    };
  }

  return {
    label: status,
    description: undefined,
    badgeClass: DEFAULT_BADGE_CLASS,
  };
}

function isSelectableStatus(value: string): value is LeadStatus {
  return leadStatusMap.has(value as LeadStatus);
}

type LeadRecord = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  message: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type LeadStatusOption = {
  value: string;
  label: string;
  description?: string;
};

const MAX_NOTES_LENGTH = 2000;

type LeadSummaryResponse = {
  total: number;
  byStatus: { status: string; count: number }[];
};

const LeadsPage = () => {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [availableStatuses, setAvailableStatuses] = useState<LeadStatusOption[]>(
    () => [...leadStatuses],
  );
  const [serverSummary, setServerSummary] = useState<LeadSummaryResponse | null>(
    null,
  );
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [updatingStatusIds, setUpdatingStatusIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isExporting, setIsExporting] = useState(false);
  const [highlightedLeadId, setHighlightedLeadId] = useState<string | null>(
    null,
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-AR", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  );

  const dialogDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-AR", {
        weekday: "short",
        day: "2-digit",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [],
  );

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const response = await authenticatedFetch("/api/leads");
      if (!response.ok) {
        const message =
          (await parseErrorMessage(response)) ??
          "No se pudieron obtener los leads.";
        throw new Error(message);
      }

      const data = (await response.json()) as {
        leads?: LeadRecord[];
        statuses?: LeadStatusOption[];
        summary?: unknown;
      };

      const sanitizedLeads: LeadRecord[] = Array.isArray(data.leads)
        ? data.leads.map((lead) => ({
            ...lead,
            company: lead.company ?? null,
            phone: lead.phone ?? null,
            notes: lead.notes ?? null,
          }))
        : [];

      const serverStatuses = Array.isArray(data.statuses)
        ? data.statuses.filter(
            (status): status is LeadStatusOption =>
              Boolean(status) &&
              typeof status.value === "string" &&
              typeof status.label === "string",
          )
        : [];

      const baseStatuses: LeadStatusOption[] =
        serverStatuses.length > 0 ? serverStatuses : [...leadStatuses];

      const unknownStatuses = sanitizedLeads
        .map((lead) => lead.status)
        .filter(
          (status, index, array) =>
            status &&
            array.indexOf(status) === index &&
            !baseStatuses.some((option) => option.value === status),
        )
        .map((status) => ({
          value: status,
          label: status,
        }));

      setAvailableStatuses([...baseStatuses, ...unknownStatuses]);
      setLeads(sanitizedLeads);
      const summaryData = parseLeadSummary(data.summary);
      const computedSummary = computeSummaryFromLeads(sanitizedLeads);
      const base = summaryData
        ? mergeSummaries(summaryData, computedSummary)
        : computedSummary;
      setServerSummary(base);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return;
      }
      const message =
        (error as Error)?.message ?? "No se pudieron obtener los leads.";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    void fetchLeads();
  }, [fetchLeads, hasHydrated]);

  useEffect(() => {
    const highlight = searchParams.get("highlight");
    if (!highlight) {
      return;
    }

    setHighlightedLeadId(highlight);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("highlight");
    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams]);

  const updateLead = useCallback(
    async (
      leadId: string,
      payload: Partial<Pick<LeadRecord, "status" | "notes">>,
    ) => {
      const response = await authenticatedFetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message =
          (await parseErrorMessage(response)) ??
          "No se pudo actualizar el lead.";
        throw new Error(message);
      }

      const updatedLead = (await response.json()) as LeadRecord;
      let nextLeads: LeadRecord[] = [];
      setLeads((previous) => {
        nextLeads = previous.map((lead) =>
          lead.id === leadId ? { ...lead, ...updatedLead } : lead,
        );
        return nextLeads;
      });
      setServerSummary(computeSummaryFromLeads(nextLeads));
      return updatedLead;
    },
    [],
  );

  const handleStatusChange = useCallback(
    async (leadId: string, newStatus: LeadStatus) => {
      setUpdatingStatusIds((prev) => {
        const next = new Set(prev);
        next.add(leadId);
        return next;
      });

      try {
        await updateLead(leadId, { status: newStatus });
        const statusMeta = getStatusMeta(newStatus);
        toast.success(`Estado actualizado a ${statusMeta.label}.`);
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          return;
        }
        toast.error(
          (error as Error)?.message ?? "No se pudo actualizar el estado del lead.",
        );
      } finally {
        setUpdatingStatusIds((prev) => {
          const next = new Set(prev);
          next.delete(leadId);
          return next;
        });
      }
    },
    [updateLead],
  );

  const selectedLead = useMemo(() => {
    if (!selectedLeadId) {
      return null;
    }
    return leads.find((lead) => lead.id === selectedLeadId) ?? null;
  }, [leads, selectedLeadId]);

  useEffect(() => {
    if (selectedLead) {
      setNotesDraft(selectedLead.notes ?? "");
    } else {
      setNotesDraft("");
    }
  }, [selectedLead]);

  const filteredLeads = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();
    return leads.filter((lead) => {
      if (statusFilter !== "all" && lead.status !== statusFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const values = [
        lead.name,
        lead.email,
        lead.company ?? "",
        lead.phone ?? "",
        lead.message,
        lead.notes ?? "",
      ];

      return values.some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [leads, searchTerm, statusFilter]);

  useEffect(() => {
    if (!highlightedLeadId) {
      return;
    }

    if (!leads.some((lead) => lead.id === highlightedLeadId)) {
      return;
    }

    const isVisible = filteredLeads.some(
      (lead) => lead.id === highlightedLeadId,
    );

    if (!isVisible) {
      setStatusFilter("all");
      setSearchTerm("");
      return;
    }

    setSelectedLeadId((current) =>
      current === highlightedLeadId ? current : highlightedLeadId,
    );

    const frame = window.requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(
        `[data-lead-row="${highlightedLeadId}"]`,
      );
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    const timeout = window.setTimeout(() => {
      setHighlightedLeadId(null);
    }, 5000);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [filteredLeads, highlightedLeadId, leads]);

  useEffect(() => {
    if (!highlightedLeadId) {
      return;
    }

    if (selectedLeadId && selectedLeadId !== highlightedLeadId) {
      setHighlightedLeadId(null);
    }
  }, [highlightedLeadId, selectedLeadId]);

  const leadSummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lead of leads) {
      counts.set(lead.status, (counts.get(lead.status) ?? 0) + 1);
    }

    if (serverSummary) {
      for (const item of serverSummary.byStatus) {
        const current = counts.get(item.status) ?? 0;
        counts.set(item.status, Math.max(current, item.count));
      }
    }

    const total = serverSummary
      ? Math.max(serverSummary.total, leads.length)
      : leads.length;

    let lastUpdatedAt: Date | null = null;
    for (const lead of leads) {
      const updatedAt = new Date(lead.updatedAt);
      if (!Number.isNaN(updatedAt.getTime())) {
        if (!lastUpdatedAt || updatedAt > lastUpdatedAt) {
          lastUpdatedAt = updatedAt;
        }
      }
    }

    const availableValues = new Set(
      availableStatuses.map((status) => status.value),
    );

    const baseCards = availableStatuses.map((status) => {
      const meta = getStatusMeta(status.value);
      const accent =
        statusCardAccents[status.value as LeadStatus] ?? defaultStatusAccent;
      return {
        status: status.value,
        label: meta.label,
        description: meta.description,
        count: counts.get(status.value) ?? 0,
        accent,
      };
    });

    const extraCards = Array.from(counts.entries())
      .filter(([status]) => !availableValues.has(status))
      .map(([status, count]) => {
        const meta = getStatusMeta(status);
        return {
          status,
          label: meta.label,
          description: meta.description,
          count,
          accent: statusCardAccents[status as LeadStatus] ?? defaultStatusAccent,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, "es"));

    return {
      total,
      cards: [...baseCards, ...extraCards],
      lastUpdatedAt,
    };
  }, [availableStatuses, leads, serverSummary]);

  const hasActiveFilters = Boolean(
    statusFilter !== "all" || searchTerm.trim().length > 0,
  );

  const handleExport = useCallback(() => {
    if (filteredLeads.length === 0) {
      toast.info("No hay leads para exportar con los filtros actuales.");
      return;
    }

    setIsExporting(true);

    try {
      const headers = [
        "Nombre",
        "Correo",
        "Empresa",
        "Teléfono",
        "Estado",
        "Mensaje",
        "Notas",
        "Recibido",
        "Actualizado",
      ];

      const sanitize = (value: string) =>
        value.replace(/\r?\n|\r/g, " ").replace(/"/g, '""');

      const rows = filteredLeads.map((lead) => [
        lead.name,
        lead.email,
        lead.company ?? "",
        lead.phone ?? "",
        getStatusMeta(lead.status).label,
        lead.message,
        lead.notes ?? "",
        dateFormatter.format(new Date(lead.createdAt)),
        dateFormatter.format(new Date(lead.updatedAt)),
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${sanitize(cell)}"`).join(","))
        .join("\r\n");

      const blob = new Blob(["\ufeff" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().split("T")[0];
      link.href = url;
      link.download = `leads-${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Exportamos tus leads en CSV.");
    } catch (error) {
      console.error("Failed to export leads", error);
      toast.error("No pudimos exportar los leads. Intenta nuevamente.");
    } finally {
      setIsExporting(false);
    }
  }, [dateFormatter, filteredLeads]);

  const columns = useMemo<TableColumn<LeadRecord>[]>(
    () => [
      {
        key: "name",
        label: "Contacto",
        render: (lead) => {
          const statusMeta = getStatusMeta(lead.status);
          return (
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-gray-900">{lead.name}</p>
                {lead.company ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {lead.company}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-gray-500">{lead.email}</p>
              {lead.phone ? (
                <p className="text-xs text-gray-500">{lead.phone}</p>
              ) : null}
              <Badge
                variant="outline"
                className={`mt-1 ${statusMeta.badgeClass}`}
              >
                {statusMeta.label}
              </Badge>
            </div>
          );
        },
      },
      {
        key: "message",
        label: "Resumen",
        render: (lead) => (
          <p className="max-w-xs truncate text-sm text-gray-600">
            {lead.message}
          </p>
        ),
      },
      {
        key: "status",
        label: "Estado",
        render: (lead) => (
          <Select
            value={
              availableStatuses.find((item) => item.value === lead.status)?.value ??
              lead.status
            }
            onValueChange={(value) => {
              if (!isSelectableStatus(value)) {
                toast.error("El estado seleccionado no es válido.");
                return;
              }
              void handleStatusChange(lead.id, value);
            }}
            disabled={updatingStatusIds.has(lead.id)}
          >
            <SelectTrigger size="sm">
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              {availableStatuses.map((status) => (
                <SelectItem
                  key={status.value}
                  value={status.value}
                  disabled={!isSelectableStatus(status.value)}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {status.label}
                    </span>
                    {status.description ? (
                      <span className="text-xs text-gray-500">
                        {status.description}
                      </span>
                    ) : null}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        key: "createdAt",
        label: "Recibido",
        render: (lead) => (
          <span className="text-sm text-gray-600">
            {dateFormatter.format(new Date(lead.createdAt))}
          </span>
        ),
      },
      {
        key: "actions",
        label: "",
        align: "right",
        render: (lead) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedLeadId(lead.id)}
          >
            Ver detalles
          </Button>
        ),
      },
    ],
    [availableStatuses, dateFormatter, handleStatusChange, updatingStatusIds],
  );

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  const isNotesDirty = useMemo(() => {
    const current = (selectedLead?.notes ?? "").trim();
    return current !== notesDraft.trim();
  }, [notesDraft, selectedLead]);

  const handleSaveNotes = useCallback(async () => {
    if (!selectedLead) {
      return;
    }

    setSavingNotes(true);
    try {
      await updateLead(selectedLead.id, { notes: notesDraft });
      toast.success("Notas actualizadas correctamente.");
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return;
      }
      toast.error(
        (error as Error)?.message ?? "No se pudieron actualizar las notas.",
      );
    } finally {
      setSavingNotes(false);
    }
  }, [notesDraft, selectedLead, updateLead]);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Leads"
        description="Centraliza las solicitudes entrantes de la web y define el próximo paso para cada oportunidad."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download className="mr-2 h-4 w-4" /> Exportar CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => void fetchLeads()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
            </Button>
          </div>
        }
      />

      <section>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: Math.max(availableStatuses.length + 1, 3) }).map(
              (_, index) => (
                <Skeleton
                  key={`summary-skeleton-${index}`}
                  className="h-[196px] w-full rounded-2xl"
                />
              ),
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:col-span-2 xl:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-500">
                Panorama general
              </p>
              <div className="mt-3 flex flex-wrap items-baseline gap-3">
                <span className="text-4xl font-semibold text-gray-900">
                  {leadSummary.total}
                </span>
                <span className="text-sm text-gray-500">leads registrados</span>
              </div>
              {leadSummary.lastUpdatedAt ? (
                <p className="mt-4 text-xs text-gray-500">
                  Última actualización: {" "}
                  {dateFormatter.format(leadSummary.lastUpdatedAt)}
                </p>
              ) : (
                <p className="mt-4 text-xs text-gray-500">
                  Aún no registraste leads.
                </p>
              )}
              <p className="mt-3 text-sm text-gray-600">
                Gestioná el estado de cada oportunidad y coordiná el seguimiento con tu equipo comercial.
              </p>
            </div>
            {leadSummary.cards.map((card) => {
              const percentage =
                leadSummary.total > 0
                  ? Math.round((card.count / leadSummary.total) * 100)
                  : 0;
              return (
                <div
                  key={card.status}
                  className={cn(
                    "rounded-2xl border p-5 shadow-sm transition",
                    card.accent.container,
                  )}
                >
                  <p
                    className={cn(
                      "text-xs font-semibold uppercase tracking-[0.28em]",
                      card.accent.label,
                    )}
                  >
                    {card.label}
                  </p>
                  <div className="mt-3 flex flex-wrap items-baseline gap-2">
                    <span
                      className={cn(
                        "text-3xl font-semibold",
                        card.accent.value,
                      )}
                    >
                      {card.count}
                    </span>
                    <span className={cn("text-sm", card.accent.muted)}>leads</span>
                  </div>
                  {leadSummary.total > 0 ? (
                    <p
                      className={cn(
                        "mt-2 text-xs font-medium",
                        card.accent.label,
                      )}
                    >
                      {percentage}% del total
                    </p>
                  ) : (
                    <p className={cn("mt-2 text-xs", card.accent.muted)}>
                      Aún sin registros
                    </p>
                  )}
                  <div
                    className={cn(
                      "mt-3 h-2 w-full overflow-hidden rounded-full",
                      card.accent.track,
                    )}
                  >
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        card.accent.progress,
                      )}
                      style={{ width: `${leadSummary.total > 0 ? percentage : 0}%` }}
                      aria-hidden
                    />
                  </div>
                  {card.description ? (
                    <p
                      className={cn(
                        "mt-3 text-xs leading-relaxed",
                        card.accent.muted,
                      )}
                    >
                      {card.description}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[2fr,1fr,auto] md:items-center">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por nombre, correo, mensaje o notas"
            className="h-11"
          />
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value)}
          >
            <SelectTrigger className="h-11 justify-between">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {availableStatuses.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters ? (
            <Button variant="ghost" onClick={handleClearFilters}>
              Limpiar filtros
            </Button>
          ) : null}
        </div>

        {errorMessage ? (
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <Table
            data={filteredLeads}
            columns={columns}
            emptyState={{
              title: "Aún no hay leads registrados",
              description:
                "Cuando alguien complete el formulario de contacto aparecerá aquí para que puedas darle seguimiento.",
              icon: NotebookPen,
              action: (
                <Button size="sm" variant="outline" onClick={() => void fetchLeads()}>
                  Refrescar
                </Button>
              ),
            }}
            getRowProps={(lead) => {
              const isHighlighted = highlightedLeadId === lead.id;
              return {
                "data-lead-row": lead.id,
                className: cn(
                  "focus:outline-none",
                  isHighlighted &&
                    "bg-[#e6f6fe] hover:bg-[#dff0fb] ring-2 ring-[#4bc3fe]/60",
                ),
                tabIndex: isHighlighted ? -1 : undefined,
              };
            }}
          />
        )}
      </div>

      <Dialog
        open={Boolean(selectedLead)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLeadId(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          {selectedLead ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedLead.name}</DialogTitle>
                <DialogDescription>
                  Recibido el {" "}
                  {dialogDateFormatter.format(new Date(selectedLead.createdAt))}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <div className="grid gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-2">
                  <div className="space-y-1 text-sm text-gray-600">
                    <p className="font-semibold text-gray-900">Correo</p>
                    <a
                      href={`mailto:${selectedLead.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {selectedLead.email}
                    </a>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p className="font-semibold text-gray-900">Teléfono</p>
                    <p>{selectedLead.phone ?? "No proporcionado"}</p>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p className="font-semibold text-gray-900">Empresa</p>
                    <p>{selectedLead.company ?? "No especificada"}</p>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p className="font-semibold text-gray-900">Estado actual</p>
                    <Badge
                      variant="outline"
                      className={getStatusMeta(selectedLead.status).badgeClass}
                    >
                      {getStatusMeta(selectedLead.status).label}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-900">
                    Mensaje
                  </p>
                  <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
                    <p className="whitespace-pre-wrap">{selectedLead.message}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">
                      Notas internas
                    </p>
                    <span className="text-xs text-gray-500">
                      {notesDraft.trim().length}/{MAX_NOTES_LENGTH}
                    </span>
                  </div>
                  <Textarea
                    value={notesDraft}
                    onChange={(event) => setNotesDraft(event.target.value)}
                    placeholder="Documentá próximos pasos, responsables o acuerdos con el cliente."
                    maxLength={MAX_NOTES_LENGTH}
                    className="min-h-[120px]"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedLeadId(null)}
                >
                  Cerrar
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSaveNotes()}
                  disabled={!isNotesDirty || savingNotes}
                  className="min-w-[150px]"
                >
                  {savingNotes ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar cambios"
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadsPage;
