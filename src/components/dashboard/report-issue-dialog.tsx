"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ReportIssueDialog({ roomId, hotelId }: { roomId: string, hotelId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      roomId,
      hotelId,
      titulo: formData.get("titulo"),
      detalle: formData.get("detalle"),
      severity: formData.get("severity"),
    };

    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Error al reportar falla");
      
      toast.success("Problema reportado a mantenimiento");
      setOpen(false);
    } catch (error) {
      toast.error("Hubo un error al enviar el reporte");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">Reportar Falla</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reportar problema en la habitación</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Gravedad (Triaje)</Label>
            <Select name="severity" required>
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná la urgencia..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ROJO">🔴 Rojo (Inutilizable - Urgente)</SelectItem>
                <SelectItem value="NARANJA">🟠 Naranja (Arreglar pronto)</SelectItem>
                <SelectItem value="AMARILLO">🟡 Amarillo (Problema menor)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Título breve</Label>
            <Input name="titulo" placeholder="Ej: Aire acondicionado gotea" required />
          </div>

          <div className="space-y-2">
            <Label>Detalles adicionales</Label>
            <Textarea name="detalle" placeholder="¿Algo más que deba saber el técnico?" rows={3} />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Enviando..." : "Enviar Reporte"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}