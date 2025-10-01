"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Loader2, Search, Users, Workflow, Megaphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { authenticatedFetch } from "@/lib/api-client";

interface SearchResultItem {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  meta?: string;
}

interface SearchResponse {
  query: string;
  results: {
    flows: Array<{
      id: string;
      name: string;
      trigger: string;
      status: string;
      updatedAt: string;
    }>;
    contacts: Array<{
      id: string;
      name: string | null;
      phone: string;
      updatedAt: string;
    }>;
    broadcasts: Array<{
      id: string;
      title: string | null;
      status: string;
      totalRecipients: number;
      updatedAt: string;
    }>;
  };
}

type SectionConfigMap = {
  [K in keyof SearchResponse["results"]]: {
    label: string;
    icon: LucideIcon;
    emptyState: string;
    toItem: (entry: SearchResponse["results"][K][number]) => SearchResultItem;
  };
};

const SECTION_CONFIG: SectionConfigMap = {
  flows: {
    label: "Flujos",
    icon: Workflow,
    emptyState: "No encontramos flujos que coincidan todavía.",
    toItem: (flow: SearchResponse["results"]["flows"][number]): SearchResultItem => ({
      id: flow.id,
      href: `/dashboard/flows/${flow.id}`,
      title: flow.name,
      subtitle: flow.trigger ? `Trigger: ${flow.trigger}` : "Sin trigger configurado",
      meta: flow.status,
    }),
  },
  contacts: {
    label: "Contactos",
    icon: Users,
    emptyState: "Aún no hay contactos que coincidan.",
    toItem: (contact: SearchResponse["results"]["contacts"][number]): SearchResultItem => ({
      id: contact.id,
      href: `/dashboard/contacts/${contact.id}`,
      title: contact.name ? contact.name : contact.phone,
      subtitle: contact.name ? contact.phone : "Sin nombre registrado",
    }),
  },
  broadcasts: {
    label: "Mensajes masivos",
    icon: Megaphone,
    emptyState: "No hay campañas que coincidan con tu búsqueda.",
    toItem: (broadcast: SearchResponse["results"]["broadcasts"][number]): SearchResultItem => ({
      id: broadcast.id,
      href: `/dashboard/broadcasts?highlight=${broadcast.id}`,
      title: broadcast.title ?? "Campaña sin título",
      subtitle: `${broadcast.totalRecipients} destinatario${broadcast.totalRecipients === 1 ? "" : "s"}`,
      meta: broadcast.status,
    }),
  },
};

const QUICK_LINKS: SearchResultItem[] = [
  {
    id: "quick-flows",
    href: "/dashboard/flows",
    title: "Explorar flujos",
    subtitle: "Administra disparadores y automatizaciones activas",
  },
  {
    id: "quick-contacts",
    href: "/dashboard/contacts",
    title: "Ver contactos",
    subtitle: "Segmenta audiencias y revisa historiales",
  },
  {
    id: "quick-broadcasts",
    href: "/dashboard/broadcasts",
    title: "Campañas masivas",
    subtitle: "Envía mensajes programados y plantillas",
  },
];

const GlobalSearchDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResponse["results"] | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebouncedQuery("");
      setResults(null);
      setErrorMessage(null);
      return;
    }

    const timeout = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [open]);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 220);

    return () => {
      window.clearTimeout(handler);
    };
  }, [query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!debouncedQuery) {
      setResults(null);
      setIsSearching(false);
      setErrorMessage(null);
      return;
    }

    let cancelled = false;

    async function performSearch() {
      try {
        setIsSearching(true);
        setErrorMessage(null);
        const response = await authenticatedFetch(
          `/api/search?q=${encodeURIComponent(debouncedQuery)}`,
        );

        if (!response.ok) {
          throw new Error("No pudimos completar la búsqueda");
        }

        const data: SearchResponse = await response.json();

        if (!cancelled) {
          setResults(data.results);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage((error as Error)?.message ?? "Error al buscar");
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }

    void performSearch();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open]);

  const hasTypedQuery = debouncedQuery.length > 0;

  const sections = useMemo(() => {
    if (!results) {
      return null;
    }

    return [
      {
        key: "flows" as const,
        config: SECTION_CONFIG.flows,
        items: results.flows.map(SECTION_CONFIG.flows.toItem),
      },
      {
        key: "contacts" as const,
        config: SECTION_CONFIG.contacts,
        items: results.contacts.map(SECTION_CONFIG.contacts.toItem),
      },
      {
        key: "broadcasts" as const,
        config: SECTION_CONFIG.broadcasts,
        items: results.broadcasts.map(SECTION_CONFIG.broadcasts.toItem),
      },
    ];
  }, [results]);

  const handleNavigate = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-none bg-white/95 p-0 text-[#04102D] shadow-xl backdrop-blur">
        <div className="flex flex-col gap-4 p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#04102D]/40" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Busca flujos, contactos o campañas (⌘K)"
              className="h-12 rounded-xl border-[#04102D]/15 bg-white pl-11 text-sm text-[#04102D]"
            />
            {isSearching ? (
              <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#4BC3FE]" />
            ) : null}
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {!hasTypedQuery ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#04102D]/50">
                Sugerencias rápidas
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {QUICK_LINKS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.href)}
                    className="rounded-xl border border-[#04102D]/10 bg-[#04102D]/5 p-4 text-left transition hover:border-[#4BC3FE]/40 hover:bg-[#4BC3FE]/10"
                  >
                    <p className="text-sm font-semibold text-[#04102D]">{item.title}</p>
                    <p className="text-xs text-[#04102D]/60">{item.subtitle}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {isSearching && hasTypedQuery ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-40" />
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            </div>
          ) : null}

          {!isSearching && hasTypedQuery && sections ? (
            <div className="space-y-6">
              {sections.map(({ key, config, items }) => {
                const Icon = config.icon;
                const isEmpty = items.length === 0;

                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-[#4BC3FE]" />
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#04102D]/60">
                        {config.label}
                      </p>
                      {results && results[key].length > 0 ? (
                        <Badge variant="outline" className="border-[#04102D]/15 text-[0.65rem] uppercase tracking-wide text-[#04102D]/60">
                          {results[key].length}
                        </Badge>
                      ) : null}
                    </div>

                    {isEmpty ? (
                      <div className="rounded-xl border border-dashed border-[#04102D]/20 bg-[#04102D]/5 px-4 py-5 text-sm text-[#04102D]/60">
                        {config.emptyState}
                      </div>
                    ) : (
                      <ul className="divide-y divide-[#04102D]/10 overflow-hidden rounded-xl border border-[#04102D]/10 bg-white">
                        {items.map((item) => (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => handleNavigate(item.href)}
                              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#4BC3FE]/10"
                            >
                              <div>
                                <p className="text-sm font-semibold text-[#04102D]">{item.title}</p>
                                <p className="text-xs text-[#04102D]/60">{item.subtitle}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                {item.meta ? (
                                  <Badge variant="secondary" className="bg-[#04102D]/5 text-[0.65rem] font-semibold uppercase tracking-wide text-[#04102D]">
                                    {item.meta}
                                  </Badge>
                                ) : null}
                                <ArrowUpRight className="h-4 w-4 text-[#04102D]/40" />
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}

          {!isSearching && hasTypedQuery && sections && sections.every((section) => section.items.length === 0) && !errorMessage ? (
            <div className="rounded-xl border border-dashed border-[#04102D]/20 bg-[#04102D]/5 px-6 py-8 text-center text-sm text-[#04102D]/60">
              No encontramos coincidencias. Ajusta el término de búsqueda o prueba con otra palabra clave.
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-[#04102D]/10 bg-[#04102D]/5 px-6 py-3 text-xs text-[#04102D]/60">
          <p>Tip: también puedes abrir esta búsqueda con ⌘K o Ctrl+K</p>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-[#04102D]/60 hover:text-[#04102D]"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearchDialog;
