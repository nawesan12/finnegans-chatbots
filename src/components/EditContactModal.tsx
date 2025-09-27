"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store";
import type { ContactRow } from "@/components/dashboard/ContactsPage";

interface EditContactModalProps {
  open: boolean;
  contact: ContactRow | null;
  onOpenChange: (open: boolean) => void;
}

const EditContactModal = ({ open, contact, onOpenChange }: EditContactModalProps) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(contact?.name ?? "");
    setPhone(contact?.phone ?? "");
    const tagNames = contact?.tags?.map((relation) => relation.tag.name).join(", ") ?? "";
    setTags(tagNames);
  }, [contact, open]);

  const hasChanges = useMemo(() => {
    if (!contact) {
      return false;
    }
    const normalizedTags = contact.tags?.map((relation) => relation.tag.name).join(", ") ?? "";
    return (
      name !== (contact.name ?? "") ||
      phone !== (contact.phone ?? "") ||
      tags !== normalizedTags
    );
  }, [contact, name, phone, tags]);

  const handleSubmit = async () => {
    if (!contact) {
      return;
    }

    if (!token) {
      toast.error("No se pudo autenticar la sesión actual");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          phone,
          tags: tags
            ? tags.split(",").map((tagName) => ({ name: tagName.trim() })).filter((tag) => tag.name)
            : [],
        }),
      });

      if (!response.ok) {
        throw new Error("No se pudo actualizar el contacto");
      }

      toast.success("Contacto actualizado");
      onOpenChange(false);
      window.dispatchEvent(new CustomEvent("contacts:updated"));
    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error al actualizar el contacto");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar contacto</DialogTitle>
          <DialogDescription>
            Actualizá la información del contacto seleccionado.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-contact-name">Nombre</Label>
            <Input
              id="edit-contact-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nombre del contacto"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-contact-phone">Teléfono</Label>
            <Input
              id="edit-contact-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Ej: +54 9 11 1234-5678"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-contact-tags">Etiquetas (separadas por comas)</Label>
            <Input
              id="edit-contact-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="vip, interesados, newsletter"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              void handleSubmit();
            }}
            disabled={submitting || !phone.trim() || !hasChanges}
          >
            {submitting ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditContactModal;
