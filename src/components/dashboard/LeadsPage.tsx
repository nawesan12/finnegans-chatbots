"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  Download,
  Loader2,
  NotebookPen,
  RefreshCw,
  Trash2,
} from "lucide-react";
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
import {
  getLeadFocusAreaDescription,
  getLeadFocusAreaLabel,
  isValidLeadFocusArea,
  leadFocusAreas,
  leadStatuses,
  type LeadStatus,
} from "@/lib/leads";
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

const searchInputId = "leads-filter-search";
const statusSelectLabelId = "leads-filter-status";
const dateFromInputId = "leads-filter-date-from";
const dateToInputId = "leads-filter-date-to";
const focusAreaSelectLabelId = "leads-filter-focus-area";
const focusAreaNoneValue = "__none";
const focusAreaNoneQueryValue = "none";
const focusAreaNoneLabel = "Sin especificar";

type DatePreset = "7d" | "30d" | "90d";

const datePresetOptions: { value: DatePreset; label: string; days: number }[] = [
  { value: "7d", label: "Últimos 7 días", days: 7 },
  { value: "30d", label: "Últimos 30 días", days: 30 },
  { value: "90d", label: "Últimos 90 días", days: 90 },
];

const managedQueryKeys = [
  "status",
  "focusArea",
  "search",
  "createdFrom",
  "createdTo",
  "range",
] as const;

function isValidDatePreset(value: string): value is DatePreset {
  return datePresetOptions.some((option) => option.value === value);
}

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

function parseDateInput(value: string, endOfDay = false) {
  if (!value) {
    return null;
  }

  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  const date = new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateForInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function computePresetDates(preset: DatePreset) {
  const option = datePresetOptions.find((item) => item.value === preset);
  if (!option) {
    return null;
  }

  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - (option.days - 1));

  return {
    from: formatDateForInput(start),
    to: formatDateForInput(end),
  };
}

function sanitizeDateParam(value: string | null, endOfDay: boolean) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return "";
  }

  return parseDateInput(trimmed, endOfDay) ? trimmed : "";
}

function derivePresetFromDates(
  from: string,
  to: string,
): DatePreset | null {
  if (!from || !to) {
    return null;
  }

  const start = parseDateInput(from, false);
  const end = parseDateInput(to, false);

  if (!start || !end) {
    return null;
  }

  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) {
    return null;
  }

  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  const match = datePresetOptions.find((option) => option.days === diffDays);
  return match?.value ?? null;
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
  focusArea: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type LeadStatusOption = {
  value: string;
  label: string;
  description?: string;
};

type LeadFocusAreaOption = {
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
  const searchParamsString = searchParams.toString();
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [focusAreaFilter, setFocusAreaFilter] = useState<string>("all");
  const [availableStatuses, setAvailableStatuses] = useState<LeadStatusOption[]>(
    () => [...leadStatuses],
  );
  const [availableFocusAreas, setAvailableFocusAreas] = useState<
    LeadFocusAreaOption[]
  >(() => leadFocusAreas.map((area) => ({ ...area })));
  const [serverSummary, setServerSummary] = useState<LeadSummaryResponse | null>(
    null,
  );
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [focusAreaDraft, setFocusAreaDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [updatingStatusIds, setUpdatingStatusIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [updatingFocusArea, setUpdatingFocusArea] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [highlightedLeadId, setHighlightedLeadId] = useState<string | null>(
    null,
  );
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset | null>(null);
  const [leadIdPendingDeletion, setLeadIdPendingDeletion] = useState<string | null>(
    null,
  );
  const [isDeletingLead, setIsDeletingLead] = useState(false);
  const skipSyncRef = useRef(false);

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

  const dateFilter = useMemo(() => {
    const from = parseDateInput(createdFrom, false);
    const to = parseDateInput(createdTo, true);

    if (from && to && from > to) {
      return { from, to, isInvalid: true } as const;
    }

    return { from, to, isInvalid: false } as const;
  }, [createdFrom, createdTo]);

  const dateRangeError = dateFilter.isInvalid
    ? "La fecha inicial no puede ser posterior a la final."
    : null;

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        statusFilter !== "all" ||
          focusAreaFilter !== "all" ||
          searchTerm.trim().length > 0 ||
          createdFrom.length > 0 ||
          createdTo.length > 0,
      ),
    [createdFrom, createdTo, focusAreaFilter, searchTerm, statusFilter],
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
            focusArea: lead.focusArea ?? null,
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
      const baseFocusAreas: LeadFocusAreaOption[] = leadFocusAreas.map((area) => ({
        ...area,
      }));
      const baseFocusAreaValues = new Set(
        baseFocusAreas.map((option) => option.value),
      );
      const unknownFocusAreas = sanitizedLeads
        .map((lead) => lead.focusArea)
        .filter(
          (focusArea): focusArea is string =>
            Boolean(focusArea) && !baseFocusAreaValues.has(focusArea),
        )
        .filter((focusArea, index, array) => array.indexOf(focusArea) === index)
        .map((focusArea) => ({
          value: focusArea,
          label: focusArea,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "es"));
      setAvailableFocusAreas([...baseFocusAreas, ...unknownFocusAreas]);
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
    if (!hasHydrated) {
      return;
    }

    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }

    const params = new URLSearchParams(searchParamsString);

    const rawStatus = params.get("status");
    const nextStatus = rawStatus?.trim() ? rawStatus.trim() : "all";
    if (nextStatus !== statusFilter) {
      setStatusFilter(nextStatus);
    }

    const rawFocus = params.get("focusArea");
    const trimmedFocus = rawFocus?.trim();
    const nextFocus = trimmedFocus
      ? trimmedFocus === focusAreaNoneQueryValue
        ? focusAreaNoneValue
        : isValidLeadFocusArea(trimmedFocus)
          ? trimmedFocus
          : "all"
      : "all";
    if (nextFocus !== focusAreaFilter) {
      setFocusAreaFilter(nextFocus);
    }

    const rawSearch = params.get("search");
    const nextSearch = rawSearch?.trim() ?? "";
    if (nextSearch !== searchTerm) {
      setSearchTerm(nextSearch);
    }

    const rawRange = params.get("range");
    const normalizedRange =
      rawRange && rawRange.trim() && isValidDatePreset(rawRange.trim())
        ? (rawRange.trim() as DatePreset)
        : null;

    let nextCreatedFrom = sanitizeDateParam(params.get("createdFrom"), false);
    let nextCreatedTo = sanitizeDateParam(params.get("createdTo"), true);
    let presetAppliedFromRange = false;

    if (!nextCreatedFrom && !nextCreatedTo && normalizedRange) {
      const computed = computePresetDates(normalizedRange);
      if (computed) {
        nextCreatedFrom = computed.from;
        nextCreatedTo = computed.to;
        presetAppliedFromRange = true;
      }
    }

    if (nextCreatedFrom !== createdFrom) {
      setCreatedFrom(nextCreatedFrom);
    }

    if (nextCreatedTo !== createdTo) {
      setCreatedTo(nextCreatedTo);
    }

    const derivedPreset = derivePresetFromDates(
      nextCreatedFrom,
      nextCreatedTo,
    );
    const nextPreset =
      derivedPreset ?? (presetAppliedFromRange ? normalizedRange : null);

    if (nextPreset !== datePreset) {
      setDatePreset(nextPreset);
    }
  }, [
    createdFrom,
    createdTo,
    datePreset,
    focusAreaFilter,
    hasHydrated,
    searchParamsString,
    searchTerm,
    statusFilter,
  ]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const currentParams = new URLSearchParams(searchParamsString);
    const nextParams = new URLSearchParams();

    currentParams.forEach((value, key) => {
      if (!managedQueryKeys.includes(key as (typeof managedQueryKeys)[number])) {
        nextParams.append(key, value);
      }
    });

    if (statusFilter !== "all") {
      nextParams.set("status", statusFilter);
    }

    if (focusAreaFilter !== "all") {
      nextParams.set(
        "focusArea",
        focusAreaFilter === focusAreaNoneValue
          ? focusAreaNoneQueryValue
          : focusAreaFilter,
      );
    }

    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) {
      nextParams.set("search", trimmedSearch);
    }

    if (createdFrom) {
      nextParams.set("createdFrom", createdFrom);
    }

    if (createdTo) {
      nextParams.set("createdTo", createdTo);
    }

    if (datePreset && createdFrom && createdTo) {
      nextParams.set("range", datePreset);
    }

    const nextQuery = nextParams.toString();
    if (nextQuery === currentParams.toString()) {
      return;
    }

    skipSyncRef.current = true;
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [
    createdFrom,
    createdTo,
    datePreset,
    focusAreaFilter,
    hasHydrated,
    pathname,
    router,
    searchParamsString,
    searchTerm,
    statusFilter,
  ]);

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
      payload: Partial<Pick<LeadRecord, "status" | "notes" | "focusArea">>,
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

  const handleFocusAreaChangeDialog = useCallback(
    async (value: string) => {
      if (!selectedLead) {
        setFocusAreaDraft(value);
        return;
      }

      const previous = selectedLead.focusArea ?? "";
      if (!isValidLeadFocusArea(value)) {
        setFocusAreaDraft(previous);
        toast.error("La necesidad principal seleccionada no es válida.");
        return;
      }
      setFocusAreaDraft(value);

      if (value === previous) {
        return;
      }

      setUpdatingFocusArea(true);

      try {
        await updateLead(selectedLead.id, { focusArea: value });
        const label = getLeadFocusAreaLabel(value) || value;
        toast.success(`Necesidad principal actualizada a ${label}.`);
      } catch (error) {
        setFocusAreaDraft(previous);
        if (error instanceof UnauthorizedError) {
          return;
        }
        toast.error(
          (error as Error)?.message ??
            "No pudimos actualizar la necesidad principal.",
        );
      } finally {
        setUpdatingFocusArea(false);
      }
    },
    [selectedLead, updateLead],
  );

  const selectedLead = useMemo(() => {
    if (!selectedLeadId) {
      return null;
    }
    return leads.find((lead) => lead.id === selectedLeadId) ?? null;
  }, [leads, selectedLeadId]);

  const leadPendingDeletion = useMemo(() => {
    if (!leadIdPendingDeletion) {
      return null;
    }
    return leads.find((lead) => lead.id === leadIdPendingDeletion) ?? null;
  }, [leadIdPendingDeletion, leads]);

  useEffect(() => {
    if (selectedLead) {
      setNotesDraft(selectedLead.notes ?? "");
      setFocusAreaDraft(selectedLead.focusArea ?? "");
    } else {
      setNotesDraft("");
      setFocusAreaDraft("");
      setUpdatingFocusArea(false);
    }
  }, [selectedLead]);

  const filteredLeads = useMemo(() => {
    if (dateFilter.isInvalid) {
      return [] as LeadRecord[];
    }

    const normalizedQuery = searchTerm.trim().toLowerCase();
    return leads.filter((lead) => {
      if (statusFilter !== "all" && lead.status !== statusFilter) {
        return false;
      }

      if (focusAreaFilter !== "all") {
        if (focusAreaFilter === focusAreaNoneValue) {
          if (lead.focusArea) {
            return false;
          }
        } else if (lead.focusArea !== focusAreaFilter) {
          return false;
        }
      }

      if (dateFilter.from || dateFilter.to) {
        const createdAtDate = new Date(lead.createdAt);
        if (!Number.isNaN(createdAtDate.getTime())) {
          if (dateFilter.from && createdAtDate < dateFilter.from) {
            return false;
          }
          if (dateFilter.to && createdAtDate > dateFilter.to) {
            return false;
          }
        }
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
        getLeadFocusAreaLabel(lead.focusArea),
      ];

      return values.some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [dateFilter, focusAreaFilter, leads, searchTerm, statusFilter]);

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
      setCreatedFrom("");
      setCreatedTo("");
      setDatePreset(null);
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
    const dataset = hasActiveFilters ? filteredLeads : leads;
    const counts = new Map<string, number>();
    for (const lead of dataset) {
      counts.set(lead.status, (counts.get(lead.status) ?? 0) + 1);
    }

    if (!hasActiveFilters && serverSummary) {
      for (const item of serverSummary.byStatus) {
        const current = counts.get(item.status) ?? 0;
        counts.set(item.status, Math.max(current, item.count));
      }
    }

    const total = hasActiveFilters
      ? dataset.length
      : serverSummary
        ? Math.max(serverSummary.total, dataset.length)
        : dataset.length;

    let lastUpdatedAt: Date | null = null;
    for (const lead of dataset) {
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
  }, [availableStatuses, filteredLeads, hasActiveFilters, leads, serverSummary]);

  const handleExport = useCallback(async () => {
    if (dateFilter.isInvalid) {
      toast.error(dateRangeError ?? "El rango de fechas seleccionado es inválido.");
      return;
    }

    if (filteredLeads.length === 0) {
      toast.info("No hay leads para exportar con los filtros actuales.");
      return;
    }

    setIsExporting(true);

    try {
      const params = new URLSearchParams();
      const trimmedSearch = searchTerm.trim();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (focusAreaFilter !== "all" && focusAreaFilter !== focusAreaNoneValue) {
        params.set("focusArea", focusAreaFilter);
      }
      if (trimmedSearch) {
        params.set("search", trimmedSearch);
      }
      if (createdFrom) {
        params.set("createdFrom", createdFrom);
      }
      if (createdTo) {
        params.set("createdTo", createdTo);
      }

      const query = params.size > 0 ? `?${params.toString()}` : "";
      const response = await authenticatedFetch(`/api/leads/export${query}`);

      if (!response.ok) {
        const message =
          (await parseErrorMessage(response)) ??
          "No se pudieron exportar los leads.";
        throw new Error(message);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("content-disposition");
      let filename = `leads-${new Date().toISOString().split("T")[0]}.csv`;

      if (contentDisposition) {
        const filenameStarMatch = /filename\*=UTF-8''([^;]+)/i.exec(
          contentDisposition,
        );
        if (filenameStarMatch?.[1]) {
          try {
            filename = decodeURIComponent(filenameStarMatch[1]);
          } catch (error) {
            console.error("Failed to decode filename", error);
          }
        } else {
          const fallbackMatch = /filename="?([^";]+)"?/i.exec(
            contentDisposition,
          );
          if (fallbackMatch?.[1]) {
            filename = fallbackMatch[1];
          }
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Exportamos tus leads en CSV.");
    } catch (error) {
      console.error("Failed to export leads", error);
      if (error instanceof UnauthorizedError) {
        return;
      }
      toast.error(
        (error as Error)?.message ??
          "No pudimos exportar los leads. Intenta nuevamente.",
      );
    } finally {
      setIsExporting(false);
    }
  }, [
    createdFrom,
    createdTo,
    dateFilter,
    dateRangeError,
    filteredLeads.length,
    focusAreaFilter,
    searchTerm,
    statusFilter,
  ]);

  const hasUnspecifiedFocusAreas = useMemo(
    () => leads.some((lead) => !lead.focusArea),
    [leads],
  );

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
        key: "focusArea",
        label: "Necesidad principal",
        render: (lead) => {
          const label = getLeadFocusAreaLabel(lead.focusArea);
          const description = getLeadFocusAreaDescription(lead.focusArea);
          return (
            <div className="space-y-1">
              <Badge
                variant="outline"
                className="border-slate-200 bg-slate-50 text-slate-700"
              >
                {label || "No especificada"}
              </Badge>
              {description ? (
                <p className="text-xs text-gray-500">{description}</p>
              ) : null}
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

  const clearDateFilters = useCallback(() => {
    setCreatedFrom("");
    setCreatedTo("");
    setDatePreset(null);
  }, []);

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setFocusAreaFilter("all");
    clearDateFilters();
  };

  const applyDatePreset = useCallback(
    (preset: DatePreset) => {
      if (datePreset === preset) {
        setCreatedFrom("");
        setCreatedTo("");
        setDatePreset(null);
        return;
      }

      const option = datePresetOptions.find((item) => item.value === preset);
      if (!option) {
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(today);
      start.setDate(start.getDate() - (option.days - 1));

      setCreatedFrom(formatDateForInput(start));
      setCreatedTo(formatDateForInput(today));
      setDatePreset(preset);
    },
    [datePreset],
  );

  const isNotesDirty = useMemo(() => {
    const current = (selectedLead?.notes ?? "").trim();
    return current !== notesDraft.trim();
  }, [notesDraft, selectedLead]);

  const handleDeleteLead = useCallback(async () => {
    if (!leadIdPendingDeletion) {
      return;
    }

    setIsDeletingLead(true);
    const targetId = leadIdPendingDeletion;
    const leadLabel =
      leadPendingDeletion?.name?.trim() ||
      leadPendingDeletion?.email ||
      "el lead";

    try {
      const response = await authenticatedFetch(`/api/leads/${targetId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const message =
          (await parseErrorMessage(response)) ??
          "No se pudo eliminar el lead.";
        throw new Error(message);
      }

      setLeads((previous) => {
        const next = previous.filter((lead) => lead.id !== targetId);
        setServerSummary(computeSummaryFromLeads(next));
        return next;
      });

      setSelectedLeadId((current) => (current === targetId ? null : current));
      setHighlightedLeadId((current) =>
        current === targetId ? null : current,
      );
      setLeadIdPendingDeletion(null);
      toast.success(`Eliminamos ${leadLabel}.`);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return;
      }
      toast.error(
        (error as Error)?.message ?? "No se pudo eliminar el lead.",
      );
    } finally {
      setIsDeletingLead(false);
    }
  }, [leadIdPendingDeletion, leadPendingDeletion]);

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
              onClick={() => {
                void handleExport();
              }}
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
        <div className="grid gap-4 md:grid-cols-[2fr,1fr,auto] lg:grid-cols-[2fr,1fr,1fr,auto] xl:grid-cols-[2fr,1fr,1fr,1fr,auto] md:items-center">
          <div className="space-y-1">
            <label
              className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-500"
              htmlFor={searchInputId}
            >
              Buscar
            </label>
            <Input
              id={searchInputId}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por nombre, correo, mensaje o notas"
              className="h-11"
            />
          </div>
          <div className="space-y-1">
            <span
              id={statusSelectLabelId}
              className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-500"
            >
              Estado
            </span>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value)}
            >
              <SelectTrigger
                className="h-11 justify-between"
                aria-labelledby={statusSelectLabelId}
              >
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
          </div>
          <div className="space-y-1">
            <span
              id={focusAreaSelectLabelId}
              className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-500"
            >
              Necesidad principal
            </span>
            <Select
              value={focusAreaFilter}
              onValueChange={(value) => setFocusAreaFilter(value)}
            >
              <SelectTrigger
                className="h-11 justify-between"
                aria-labelledby={focusAreaSelectLabelId}
              >
                <SelectValue placeholder="Todas las necesidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las necesidades</SelectItem>
                {hasUnspecifiedFocusAreas ? (
                  <SelectItem value={focusAreaNoneValue}>
                    {focusAreaNoneLabel}
                  </SelectItem>
                ) : null}
                {availableFocusAreas.map((area) => (
                  <SelectItem key={area.value} value={area.value}>
                    {area.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label
              className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-500"
              htmlFor={dateFromInputId}
            >
              Desde
            </label>
            <Input
              id={dateFromInputId}
              type="date"
              value={createdFrom}
              max={createdTo || undefined}
              onChange={(event) => {
                setCreatedFrom(event.target.value);
                setDatePreset(null);
              }}
              className="h-11"
              aria-invalid={dateFilter.isInvalid}
            />
          </div>
          <div className="space-y-1">
            <label
              className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-500"
              htmlFor={dateToInputId}
            >
              Hasta
            </label>
            <Input
              id={dateToInputId}
              type="date"
              value={createdTo}
              min={createdFrom || undefined}
              onChange={(event) => {
                setCreatedTo(event.target.value);
                setDatePreset(null);
              }}
              className="h-11"
              aria-invalid={dateFilter.isInvalid}
            />
          </div>
          <div className="flex items-end">
            {hasActiveFilters ? (
              <Button variant="ghost" onClick={handleClearFilters}>
                Limpiar filtros
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="font-semibold uppercase tracking-[0.28em] text-gray-400">
            Rangos rápidos
          </span>
          {datePresetOptions.map((preset) => (
            <Button
              key={preset.value}
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "rounded-full border-dashed border-gray-200 text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50",
                datePreset === preset.value &&
                  "border-transparent bg-[#04102D] text-white hover:bg-[#04102D]/90",
              )}
              onClick={() => applyDatePreset(preset.value)}
            >
              {preset.label}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full border-dashed border-gray-200 text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            onClick={clearDateFilters}
            disabled={!createdFrom && !createdTo}
          >
            Todo el histórico
          </Button>
        </div>

        {dateRangeError ? (
          <p className="text-xs font-medium text-red-600">{dateRangeError}</p>
        ) : null}

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
                  <div className="space-y-2 text-sm text-gray-600">
                    <p className="font-semibold text-gray-900">Necesidad principal</p>
                    <Select
                      value={focusAreaDraft || undefined}
                      onValueChange={(value) => {
                        void handleFocusAreaChangeDialog(value);
                      }}
                      disabled={updatingFocusArea}
                    >
                      <SelectTrigger className="w-full border-gray-200 bg-white text-left text-gray-700 focus:border-[#4BC3FE] focus:ring-[#4BC3FE]/40">
                        <SelectValue placeholder="Selecciona una opción" />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-gray-700">
                        {availableFocusAreas.map((area) => (
                          <SelectItem
                            key={area.value}
                            value={area.value}
                            disabled={!isValidLeadFocusArea(area.value)}
                          >
                            <div className="space-y-0.5 text-left">
                              <p className="text-sm font-medium text-gray-900">
                                {area.label}
                              </p>
                              {area.description ? (
                                <p className="text-xs text-gray-500">
                                  {area.description}
                                </p>
                              ) : null}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {getLeadFocusAreaDescription(
                      focusAreaDraft || selectedLead.focusArea,
                    ) ? (
                      <p className="text-xs text-gray-500">
                        {getLeadFocusAreaDescription(
                          focusAreaDraft || selectedLead.focusArea,
                        )}
                      </p>
                    ) : null}
                    {updatingFocusArea ? (
                      <p className="flex items-center gap-2 text-xs text-gray-500">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Guardando cambios...
                      </p>
                    ) : null}
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

              <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedLeadId(null)}
                >
                  Cerrar
                </Button>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setLeadIdPendingDeletion(selectedLead.id)}
                    disabled={isDeletingLead}
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar lead
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
                </div>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(leadPendingDeletion)}
        onOpenChange={(open) => {
          if (!open && !isDeletingLead) {
            setLeadIdPendingDeletion(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          {leadPendingDeletion ? (
            <>
              <DialogHeader>
                <DialogTitle>Eliminar lead</DialogTitle>
                <DialogDescription>
                  ¿Seguro que deseas eliminar
                  {" "}
                  <span className="font-semibold">
                    {leadPendingDeletion.name ?? leadPendingDeletion.email ??
                      "este lead"}
                  </span>
                  ? Esta acción no se puede deshacer.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-start gap-3 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <p>
                  Se eliminarán las notas internas y el historial asociado a
                  este lead. Te recomendamos guardar cualquier información
                  importante antes de continuar.
                </p>
              </div>
              <DialogFooter className="gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLeadIdPendingDeletion(null)}
                  disabled={isDeletingLead}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void handleDeleteLead()}
                  disabled={isDeletingLead}
                >
                  {isDeletingLead ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    "Eliminar definitivamente"
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
