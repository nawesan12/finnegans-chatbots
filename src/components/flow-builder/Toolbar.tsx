import React, { useRef } from "react";
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
} from "lucide-react";

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
}) {
    const fileRef = useRef(null);
    return (
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b px-3 py-2 flex items-center gap-2">
            <Button variant="secondary" onClick={onNew}>
                <Wand2 className="h-4 w-4 mr-2" />
                Nuevo
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
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
            <Button onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
            </Button>
            <Separator orientation="vertical" className="mx-2" />
            <Button variant="outline" onClick={onValidate}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Validar
            </Button>
            <Button variant="outline" onClick={onAutoLayout}>
                <LayoutList className="h-4 w-4 mr-2" />
                Auto-Acomodar
            </Button>
            <Separator orientation="vertical" className="mx-2" />
            <Button variant="ghost" onClick={onUndo}>
                <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={onRedo}>
                <Redo2 className="h-4 w-4" />
            </Button>
            <div className="ml-auto flex items-center gap-1">
                {selectedId && <Badge variant="outline">Selected: {selectedId}</Badge>}
                <Button variant="ghost" onClick={fitView}>
                    <Minimize2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" onClick={zoomOut}>
                    <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="ghost" onClick={zoomIn}>
                    <ZoomIn className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
