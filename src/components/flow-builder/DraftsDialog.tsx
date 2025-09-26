"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArchiveRestore,
  Clock,
  Files,
  HardDriveDownload,
  Trash2,
  Loader2,
} from "lucide-react";

export type DraftSummary = {
  id: string;
  name: string;
  updatedAt: string;
};

type DraftsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drafts: DraftSummary[];
  onSave: (payload: { id?: string | null; name: string }) => void | Promise<void>;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  saving?: boolean;
  dirty?: boolean;
  currentDraftId?: string | null;
  currentDraftName?: string | null;
  lastSavedAt?: string | null;
};

const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
};

export function DraftsDialog({
  open,
  onOpenChange,
  drafts,
  onSave,
  onLoad,
  onDelete,
  saving = false,
  dirty = false,
  currentDraftId,
  currentDraftName,
  lastSavedAt,
}: DraftsDialogProps) {
  const [name, setName] = useState<string>("");
  const [overwrite, setOverwrite] = useState<boolean>(Boolean(currentDraftId));

  useEffect(() => {
    if (!open) return;
    setName(currentDraftName ?? "");
    setOverwrite(Boolean(currentDraftId));
  }, [open, currentDraftId, currentDraftName]);

  const disabled = !name.trim();

  const sortedDrafts = useMemo(
    () =>
      drafts
        .slice()
        .sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
    [drafts],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gestionar borradores</DialogTitle>
          <DialogDescription>
            Guardá versiones de tu flujo y recuperalas cuando las necesites.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section className="space-y-3 rounded-lg border bg-muted/40 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold">Guardar borrador</h3>
                <p className="text-xs text-muted-foreground">
                  {dirty
                    ? "Tenés cambios sin guardar. Guardalos para no perderlos."
                    : "No hay cambios pendientes."}
                </p>
              </div>
              {dirty ? (
                <Badge variant="destructive">Cambios sin guardar</Badge>
              ) : lastSavedAt ? (
                <Badge variant="secondary">
                  Guardado {formatDateTime(lastSavedAt)}
                </Badge>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="draft-name" className="text-xs uppercase tracking-wide">
                Nombre del borrador
              </Label>
              <Input
                id="draft-name"
                placeholder="Ej: Bienvenida campaña invierno"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="overwrite-draft"
                  checked={overwrite}
                  onCheckedChange={(value) => setOverwrite(value)}
                  disabled={!currentDraftId}
                />
                <Label
                  htmlFor="overwrite-draft"
                  className="text-sm text-muted-foreground"
                >
                  Sobrescribir borrador actual
                </Label>
              </div>
              <span className="text-xs text-muted-foreground">
                {overwrite && currentDraftName
                  ? `Se actualizará “${currentDraftName}”.`
                  : "Se creará un nuevo borrador."}
              </span>
            </div>

            <Button
              type="button"
              onClick={() =>
                onSave({ id: overwrite ? currentDraftId : null, name: name.trim() })
              }
              disabled={disabled || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando…
                </>
              ) : (
                <>
                  <HardDriveDownload className="mr-2 h-4 w-4" />
                  Guardar borrador
                </>
              )}
            </Button>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Files className="h-4 w-4" /> Borradores guardados
            </div>
            <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
              {sortedDrafts.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  <ArchiveRestore className="h-5 w-5" />
                  Todavía no guardaste borradores.
                </div>
              ) : (
                sortedDrafts.map((draft) => {
                  const isCurrent = draft.id === currentDraftId;
                  return (
                    <div
                      key={draft.id}
                      className="flex flex-col gap-2 rounded-lg border bg-background/70 p-3 shadow-sm md:flex-row md:items-center md:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {draft.name}
                          {isCurrent ? (
                            <Badge variant="secondary" className="uppercase">
                              Actual
                            </Badge>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDateTime(draft.updatedAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onLoad(draft.id)}
                        >
                          <ArchiveRestore className="mr-2 h-4 w-4" />
                          Cargar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onDelete(draft.id)}
                          aria-label={`Eliminar ${draft.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
