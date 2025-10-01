"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { authenticatedFetch } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store";

type AddContactModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
};

const AddContactModal = ({ open, onOpenChange, userId }: AddContactModalProps) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const token = useAuthStore((state) => state.token);

  const handleSubmit = async () => {
    if (!token) {
      toast.error("No se pudo autenticar la sesión actual");
      return;
    }

    try {
      setSubmitting(true);
      const response = await authenticatedFetch("/api/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          userId,
          tags: tags
            ? tags.split(",").map((t) => ({ name: t.trim() }))
            : [],
          notes,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to create contact");
      }
      toast.success("Contacto creado");
      setName("");
      setPhone("");
      setTags("");
      setNotes("");
      onOpenChange(false);
      window.dispatchEvent(new CustomEvent("contacts:updated"));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error creating contact";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo contacto</DialogTitle>
          <DialogDescription>
            Ingresa los detalles del contacto.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Teléfono</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Etiquetas (separadas por comas)</label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notas internas</label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Agrega contexto para tu equipo (opcional)"
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !phone.trim() || submitting}
          >
            {submitting ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddContactModal;

