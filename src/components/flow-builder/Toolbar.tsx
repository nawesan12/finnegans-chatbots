"use client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Download,
  CheckCircle2,
  LayoutList,
  Wand2,
  Redo2,
  Undo2,
  ZoomIn,
  ZoomOut,
  Minimize2,
  Clipboard,
  HardDriveDownload,
  ArchiveRestore,
  Loader2,
  Save,
} from "lucide-react";
import { toast } from "sonner";

type ImportEvent =
  | React.ChangeEvent<HTMLInputElement>
  | { target?: { files?: FileList | File[] | null; value?: string } };

type TopbarProps = {
  onNew: () => void;
  onImport: (event: ImportEvent) => void;
  onExport: () => Promise<void> | void;
  onValidate: () => void;
  onAutoLayout: () => void;
  onUndo: () => void;
  onRedo: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitView: () => void;
  selectedId?: string | null;
  /** opcional: muestra el zoom actual 0..1..2 */
  zoomLevel?: number;
  /** opcional: nombre base para exportar */
  exportName?: string;
  onSaveDraft?: () => Promise<void> | void;
  savingDraft?: boolean;
  onSaveFlow?: () => Promise<void> | void;
  savingFlow?: boolean;
  onOpenDrafts?: () => void;
  dirty?: boolean;
  currentDraftName?: string | null;
  lastSavedAt?: string | null;
  canSaveFlow?: boolean;
};

export function Topbar({
  onNew,
  onImport,
  onExport,
  onValidate,
  onAutoLayout,
  onUndo,
  onRedo,
  zoomIn,
  zoomOut,
  fitView,
  selectedId,
  zoomLevel,
  exportName = "flow",
  onSaveDraft,
  savingDraft = false,
  onSaveFlow,
  savingFlow = false,
  onOpenDrafts,
  dirty = false,
  currentDraftName,
  lastSavedAt,
  canSaveFlow = true,
}: TopbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const draftLabel = useMemo(() => {
    if (!currentDraftName || !currentDraftName.trim()) {
      return "Borrador sin título";
    }
    return currentDraftName.trim();
  }, [currentDraftName]);

  const lastSavedLabel = useMemo(() => {
    if (!lastSavedAt) return null;
    const date = new Date(lastSavedAt);
    if (Number.isNaN(date.getTime())) return lastSavedAt;
    try {
      return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return date.toLocaleString();
    }
  }, [lastSavedAt]);

  // --- Helpers ---
  const copySelectedId = async () => {
    if (!selectedId) return;
    try {
      await navigator.clipboard.writeText(selectedId);
      toast.success("ID copiado al portapapeles");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = selectedId;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        toast.success("ID copiado al portapapeles");
      } catch {
        toast.error("No se pudo copiar el ID");
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  const handleExport = useCallback(async () => {
    try {
      setBusy(true);
      const maybe = onExport?.();
      if (maybe instanceof Promise) await maybe;
      toast.success(`Exportado (${exportName}.json)`);
    } catch {
      toast.error("Error al exportar");
    } finally {
      setBusy(false);
    }
  }, [exportName, onExport]);

  // --- Drag & drop para importar JSON ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      toast.error("Soltá un archivo .json");
      return;
    }
    // Creamos un evento sintético con el file, manteniendo compat con tu onImport
    const synthetic: ImportEvent = {
      target: { files: [file] as File[] },
    };
    onImport?.(synthetic);
    toast.success(`Importando ${file.name}…`);
  };

  // --- Atajos de teclado ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // evita cuando se escribe en inputs
      const el = e.target as HTMLElement;
      const tag = el?.tagName?.toLowerCase();
      const typing =
        tag === "input" || tag === "textarea" || el?.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "o") {
        e.preventDefault();
        fileRef.current?.click();
        return;
      }
      if (mod && e.key.toLowerCase() === "n" && !typing) {
        e.preventDefault();
        onNew?.();
        return;
      }
      if (mod && e.key.toLowerCase() === "s" && !typing) {
        e.preventDefault();
        if (e.shiftKey) handleExport();
        else if (onSaveFlow) void onSaveFlow();
        else void onSaveDraft?.();
        return;
      }
      if (mod && e.key.toLowerCase() === "z" && !typing) {
        e.preventDefault();
        if (e.shiftKey) onRedo?.();
        else onUndo?.();
        return;
      }
      if (mod && e.key.toLowerCase() === "l" && !typing) {
        e.preventDefault();
        onAutoLayout?.();
        return;
      }
      if (mod && e.key.toLowerCase() === "k" && !typing) {
        e.preventDefault();
        onValidate?.();
        return;
      }
      if (mod && e.key === "0" && !typing) {
        e.preventDefault();
        fitView?.();
        return;
      }
      if (mod && (e.key === "=" || e.key === "+") && !typing) {
        e.preventDefault();
        zoomIn?.();
        return;
      }
      if (mod && e.key === "-" && !typing) {
        e.preventDefault();
        zoomOut?.();
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    handleExport,
    onNew,
    onAutoLayout,
    onValidate,
    onUndo,
    onRedo,
    zoomIn,
    zoomOut,
    fitView,
    onSaveDraft,
    onSaveFlow,
  ]);

  const zoomLabel = useMemo(
    () =>
      typeof zoomLevel === "number" ? `${Math.round(zoomLevel * 100)}%` : null,
    [zoomLevel],
  );

  return (
    <div
      className={[
        "sticky top-0 z-20 border-b px-3 py-2 flex items-center gap-2",
        "bg-white/80 backdrop-blur",
        dragOver ? "ring-2 ring-cyan-400" : "",
      ].join(" ")}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      title="Tip: arrastrá un .json para importar"
    >
      <Button
        variant="secondary"
        onClick={onNew}
        aria-label="Nuevo flujo"
        title="Nuevo (⌘/Ctrl+N)"
      >
        <Wand2 className="h-4 w-4 mr-2" />
        Nuevo
      </Button>

      <Button
        variant="secondary"
        onClick={() => fileRef.current?.click()}
        aria-label="Importar"
        title="Importar (⌘/Ctrl+O)"
      >
        <Upload className="h-4 w-4 mr-2" />
        Importar
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={onImport}
      />

      <Button
        onClick={handleExport}
        disabled={busy}
        aria-label="Exportar"
        title="Exportar (⇧+⌘/Ctrl+S)"
      >
        <Download className="h-4 w-4 mr-2" />
        Exportar
      </Button>

      <Button
        onClick={onSaveFlow}
        disabled={savingFlow || !onSaveFlow || !canSaveFlow}
        aria-label="Guardar flujo"
        title={
          dirty
            ? "Guardar cambios (⌘/Ctrl+S)"
            : "Guardar flujo (⌘/Ctrl+S)"
        }
      >
        {savingFlow ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Guardando…
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Guardar flujo
          </>
        )}
      </Button>

      <Button
        onClick={onSaveDraft}
        disabled={savingDraft || !onSaveDraft}
        aria-label="Guardar borrador"
        title="Guardar borrador"
      >
        {savingDraft ? (
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

      <Button
        variant="secondary"
        onClick={onOpenDrafts}
        disabled={!onOpenDrafts}
        aria-label="Gestionar borradores"
        title="Gestionar borradores"
      >
        <ArchiveRestore className="mr-2 h-4 w-4" />
        Borradores
      </Button>

      <Separator orientation="vertical" className="mx-2" />

      <Button
        variant="outline"
        onClick={onValidate}
        aria-label="Validar flujo"
        title="Validar (⌘/Ctrl+K)"
      >
        <CheckCircle2 className="h-4 w-4 mr-2" />
        Validar
      </Button>
      <Button
        variant="outline"
        onClick={onAutoLayout}
        aria-label="Auto-Acomodar"
        title="Auto-Acomodar (⌘/Ctrl+L)"
      >
        <LayoutList className="h-4 w-4 mr-2" />
        Auto-Acomodar
      </Button>

      <Separator orientation="vertical" className="mx-2" />

      <Button
        variant="ghost"
        onClick={onUndo}
        aria-label="Deshacer"
        title="Deshacer (⌘/Ctrl+Z)"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        onClick={onRedo}
        aria-label="Rehacer"
        title="Rehacer (⇧+⌘/Ctrl+Z)"
      >
        <Redo2 className="h-4 w-4" />
      </Button>

      <div className="ml-auto flex items-center gap-1">
        <div className="hidden items-center gap-1 pr-2 sm:flex">
          <Badge variant="outline" title="Borrador actual">
            {draftLabel}
          </Badge>
          {dirty ? (
            <Badge variant="destructive" title="Cambios sin guardar">
              Cambios sin guardar
            </Badge>
          ) : lastSavedLabel ? (
            <Badge variant="secondary" title={`Último guardado ${lastSavedLabel}`}>
              Guardado {lastSavedLabel}
            </Badge>
          ) : null}
        </div>

        {selectedId && (
          <>
            <Badge variant="outline" title="Nodo seleccionado">
              Nodo: {selectedId}
            </Badge>
            <Button
              variant="ghost"
              onClick={copySelectedId}
              aria-label="Copiar ID seleccionado"
              title="Copiar ID"
            >
              <Clipboard className="h-4 w-4" />
            </Button>
          </>
        )}

        {zoomLabel && (
          <Badge variant="secondary" className="ml-2" title="Nivel de zoom">
            {zoomLabel}
          </Badge>
        )}

        <Button
          variant="ghost"
          onClick={fitView}
          aria-label="Ajustar vista"
          title="Ajustar vista (⌘/Ctrl+0)"
        >
          <Minimize2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          onClick={zoomOut}
          aria-label="Alejar"
          title="Alejar (⌘/Ctrl+-)"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          onClick={zoomIn}
          aria-label="Acercar"
          title="Acercar (⌘/Ctrl+=)"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
