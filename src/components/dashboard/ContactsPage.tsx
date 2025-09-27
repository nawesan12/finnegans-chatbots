"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MoreVertical, Upload, UserPlus, Search } from "lucide-react";

import PageHeader from "@/components/dashboard/PageHeader";
import Table from "@/components/dashboard/Table";
import { itemVariants } from "@/lib/animations";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store";
import { useDashboardActions } from "@/lib/dashboard-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import EditContactModal from "@/components/EditContactModal";

type ContactTagRelation = { tag: { id: string; name: string } };

export type ContactRow = {
  id: string;
  name?: string | null;
  phone: string;
  updatedAt: string;
  tags?: ContactTagRelation[];
};

const ContactsPage = () => {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [contactToEdit, setContactToEdit] = useState<ContactRow | null>(null);
  const [contactToDelete, setContactToDelete] = useState<ContactRow | null>(
    null,
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const dashboardActions = useDashboardActions();

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat("es-AR", {
        maximumFractionDigits: 0,
      }),
    [],
  );

  const fetchContacts = useCallback(async () => {
    if (!token) {
      setContacts([]);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/contacts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "No se pudieron obtener los contactos");
      }
      const data: ContactRow[] = await response.json();
      setContacts(data);
    } catch (error) {
      toast.error(
        (error as Error)?.message ?? "Error al obtener la agenda de contactos",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    void fetchContacts();
  }, [fetchContacts, hasHydrated]);

  useEffect(() => {
    const handler = () => {
      void fetchContacts();
    };
    window.addEventListener("contacts:updated", handler);
    return () => window.removeEventListener("contacts:updated", handler);
  }, [fetchContacts]);

  const availableTags = useMemo(() => {
    const entries = new Map<string, { id: string; name: string }>();
    contacts.forEach((contact) => {
      contact.tags?.forEach(({ tag }) => {
        if (!entries.has(tag.id)) {
          entries.set(tag.id, tag);
        }
      });
    });
    return Array.from(entries.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
    );
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return contacts.filter((contact) => {
      const matchesTag =
        tagFilter === "all" ||
        contact.tags?.some((relation) => relation.tag.id === tagFilter);

      if (!matchesTag) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const name = contact.name?.toLowerCase() ?? "";
      const phone = contact.phone.toLowerCase();
      const tagNames = contact.tags?.map((relation) =>
        relation.tag.name.toLowerCase(),
      );

      return [name, phone, ...(tagNames ?? [])].some((value) =>
        value.includes(normalizedSearch),
      );
    });
  }, [contacts, searchTerm, tagFilter]);

  const hasActiveFilters = Boolean(searchTerm.trim() || tagFilter !== "all");

  const handleClearFilters = () => {
    setSearchTerm("");
    setTagFilter("all");
  };

  const handleOpenImport = () => {
    dashboardActions?.openImportContacts?.();
  };

  const handleOpenNewContact = () => {
    dashboardActions?.openNewContact?.();
  };

  const handleCopyPhone = useCallback(async (phone: string) => {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        throw new Error("clipboard-unavailable");
      }
      await navigator.clipboard.writeText(phone);
      toast.success("Número de teléfono copiado");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo copiar el teléfono");
    }
  }, []);

  const handleOpenEdit = useCallback((contact: ContactRow) => {
    setContactToEdit(contact);
  }, []);

  const handleOpenDeleteDialog = useCallback((contact: ContactRow) => {
    setContactToDelete(contact);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDeleteContact = useCallback(async () => {
    if (!contactToDelete) {
      return;
    }
    if (!token) {
      toast.error("No se pudo autenticar la sesión actual");
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/contacts/${contactToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("No se pudo eliminar el contacto");
      }

      toast.success("Contacto eliminado");
      window.dispatchEvent(new CustomEvent("contacts:updated"));
      setIsDeleteDialogOpen(false);
      setContactToDelete(null);
    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error al eliminar el contacto");
    } finally {
      setIsDeleting(false);
    }
  }, [contactToDelete, token]);

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Nombre",
        render: (row: ContactRow) => (
          <Link
            href={`/dashboard/contacts/${row.id}`}
            className="font-medium text-[#8694ff] transition-colors hover:text-indigo-700"
          >
            {row.name || "Sin nombre"}
          </Link>
        ),
      },
      {
        key: "phone",
        label: "Teléfono",
        className: "font-medium text-gray-900",
      },
      {
        key: "tags",
        label: "Etiquetas",
        render: (row: ContactRow) => (
          <div className="flex flex-wrap gap-1">
            {row.tags?.length ? (
              row.tags.map((relation) => (
                <span
                  key={relation.tag.id}
                  className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600"
                >
                  {relation.tag.name}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400">Sin etiquetas</span>
            )}
          </div>
        ),
      },
      {
        key: "updatedAt",
        label: "Última actualización",
        align: "right" as const,
        className: "text-gray-500",
        render: (row: ContactRow) => (
          <span>
            {new Date(row.updatedAt).toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        ),
      },
      {
        key: "actions",
        label: "Acciones",
        align: "center" as const,
        render: (row: ContactRow) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full p-1.5 text-[#4bc3fe] transition-colors hover:bg-[#eef2ff] hover:text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-200">
                <MoreVertical className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link
                  href={`/dashboard/contacts/${row.id}`}
                  className="w-full text-left"
                >
                  Ver detalle
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleCopyPhone(row.phone)}>
                Copiar teléfono
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleOpenEdit(row)}>
                Editar contacto
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleOpenDeleteDialog(row)}
                className="text-red-600 focus:text-red-600"
              >
                Eliminar contacto
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [handleCopyPhone, handleOpenDeleteDialog, handleOpenEdit],
  );

  const emptyStateTitle = hasActiveFilters
    ? "No se encontraron contactos"
    : "Aún no tienes contactos";

  const emptyStateDescription = hasActiveFilters
    ? "Prueba ajustando la búsqueda o quitando los filtros aplicados."
    : "Importa tu base de datos o crea un contacto manualmente para comenzar a conversar.";

  const headerActions = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleOpenNewContact}
      >
        <UserPlus className="h-4 w-4" />
        Nuevo contacto
      </Button>
      <Button
        type="button"
        onClick={handleOpenImport}
        className="bg-[#8694ff] text-white hover:bg-indigo-700"
      >
        <Upload className="h-4 w-4" />
        Importar contactos
      </Button>
    </>
  );

  const summaryText = `Mostrando ${numberFormatter.format(
    filteredContacts.length,
  )} de ${numberFormatter.format(contacts.length)} contactos`;

  const isInitialLoading = loading && !contacts.length;

  if (isInitialLoading) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader
          title="Contactos"
          description="Centraliza y segmenta tu base de clientes para nutrir tus campañas y automatizaciones."
          actions={headerActions}
        />
        <motion.div
          variants={itemVariants}
          className="overflow-hidden rounded-lg bg-white shadow-md"
        >
          <div className="flex justify-end border-b border-gray-100 p-6">
            <Skeleton className="h-9 w-40 rounded-md" />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={`contacts-loading-header-${String(column.key)}`}
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr key={`contacts-loading-row-${rowIndex}`}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: 2 }).map((_, tagIndex) => (
                          <Skeleton
                            key={`contacts-loading-tag-${rowIndex}-${tagIndex}`}
                            className="h-6 w-16 rounded-full"
                          />
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <Skeleton className="h-6 w-6 rounded-full" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Contactos"
        description="Centraliza y segmenta tu base de clientes para nutrir tus campañas y automatizaciones."
        actions={headerActions}
      />
      <motion.div
        variants={itemVariants}
        className="rounded-lg bg-white shadow-md"
      >
        <div className="space-y-4 border-b border-gray-100 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nombre, teléfono o etiqueta"
                  className="pl-9"
                />
              </div>
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="w-full max-w-[200px]">
                  <SelectValue placeholder="Filtrar por etiqueta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las etiquetas</SelectItem>
                  {availableTags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span>{summaryText}</span>
              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                >
                  Limpiar filtros
                </Button>
              ) : null}
              {loading ? (
                <span className="flex items-center gap-2 text-gray-400">
                  <span className="h-2 w-2 animate-ping rounded-full bg-[#8694ff]" />
                  Actualizando lista...
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <Table
          columns={columns}
          data={filteredContacts}
          emptyState={{
            title: emptyStateTitle,
            description: emptyStateDescription,
            action: (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenNewContact}
                >
                  <UserPlus className="h-4 w-4" />
                  Nuevo contacto
                </Button>
                <Button
                  type="button"
                  onClick={handleOpenImport}
                  className="bg-[#8694ff] text-white hover:bg-indigo-700"
                >
                  <Upload className="h-4 w-4" />
                  Importar contactos
                </Button>
              </>
            ),
          }}
          className="rounded-b-lg"
        />
        <EditContactModal
          open={Boolean(contactToEdit)}
          contact={contactToEdit}
          onOpenChange={(open) => {
            if (!open) {
              setContactToEdit(null);
            }
          }}
        />
        <Dialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            if (!open && !isDeleting) {
              setIsDeleteDialogOpen(false);
              setContactToDelete(null);
            } else if (open) {
              setIsDeleteDialogOpen(true);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar contacto</DialogTitle>
              <DialogDescription>
                Esta acción no se puede deshacer. ¿Querés eliminar a
                {" "}
                <span className="font-medium text-gray-900">
                  {contactToDelete?.name || contactToDelete?.phone || "este contacto"}
                </span>
                ?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (isDeleting) {
                    return;
                  }
                  setIsDeleteDialogOpen(false);
                  setContactToDelete(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void handleDeleteContact();
                }}
                disabled={isDeleting}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
};

export default ContactsPage;
