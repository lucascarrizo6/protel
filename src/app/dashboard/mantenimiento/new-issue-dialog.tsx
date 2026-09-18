"use client";

import { useState, type ElementType } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { MaintenanceSeverity } from "@/generated/prisma/enums";
import {
  MAINTENANCE_SEVERITIES,
  SEVERITY_DOT,
  SEVERITY_MEANING,
  formatSeverity,
} from "@/lib/maintenance";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { RoomOption } from "./maintenance-view";

type NewIssueDialogProps = {
  rooms: RoomOption[];
  currentUserName: string;
};

export function NewIssueDialog({ rooms, currentUserName }: NewIssueDialogProps) {
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [severity, setSeverity] = useState<MaintenanceSeverity | "">("");
  const [reportadoPor, setReportadoPor] = useState(currentUserName);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function resetForm() {
    setRoomId("");
    setTitulo("");
    setDetalle("");
    setSeverity("");
    setReportadoPor(currentUserName);
    setFormError(null);
  }

  async function createIssue() {
    if (!roomId) return setFormError("Elegí la habitación.");
    if (!titulo.trim()) return setFormError("Escribí qué problema tiene.");
    if (!severity) return setFormError("Elegí la gravedad.");

    setSaving(true);
    setFormError(null);
    try {
      const response = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          titulo,
          detalle,
          severity,
          reportadoPor,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(data?.error ?? "No se pudo cargar el problema.");

      toast.success("Problema cargado.");
      resetForm();
      setDialogOpen(false);
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo cargar.");
    } finally {
      setSaving(false);
    }
  }

  const SafeDialogTrigger = DialogTrigger as ElementType;

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(next) => {
        setDialogOpen(next);
        if (!next) resetForm();
      }}
    >
      <SafeDialogTrigger asChild>
        <div>
          <Button size="sm">Nuevo problema</Button>
        </div>
      </SafeDialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo problema de mantenimiento</DialogTitle>
          <DialogDescription>
            Queda anotado en la habitación hasta que alguien lo marque como
            arreglado.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mnt-room">Habitación</Label>
            <Select value={roomId} onValueChange={(value) => setRoomId(value ?? "")}>
              <SelectTrigger id="mnt-room" className="w-full">
                <SelectValue placeholder="Elegí una habitación">
                  {roomId && rooms.find((r) => r.id === roomId)
                    ? `Hab. ${rooms.find((r) => r.id === roomId)!.number} · Piso ${
                        rooms.find((r) => r.id === roomId)!.floor
                      }`
                    : "Elegí una habitación"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    Hab. {room.number} · Piso {room.floor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mnt-titulo">Qué problema tiene</Label>
            <Input
              id="mnt-titulo"
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              placeholder="Ej: no anda el aire acondicionado"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mnt-detalle">Detalle (opcional)</Label>
            <Textarea
              id="mnt-detalle"
              value={detalle}
              onChange={(event) => setDetalle(event.target.value)}
              rows={2}
              placeholder="Repuesto pedido, llega el jueves…"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Gravedad</Label>
            <div className="grid grid-cols-3 gap-2">
              {MAINTENANCE_SEVERITIES.map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverity(sev)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-sm font-medium transition-colors",
                    severity === sev
                      ? "border-foreground/30 bg-muted"
                      : "border-input hover:bg-muted/50"
                  )}
                >
                  <span className={cn("size-2.5 rounded-full", SEVERITY_DOT[sev])} />
                  {formatSeverity(sev)}
                </button>
              ))}
            </div>
            {severity && (
              <p className="text-xs text-muted-foreground">
                {SEVERITY_MEANING[severity]}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mnt-reporta">Reportado por</Label>
            <Input
              id="mnt-reporta"
              value={reportadoPor}
              onChange={(event) => setReportadoPor(event.target.value)}
              placeholder="Nombre"
            />
          </div>

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Rojo y naranja pasan la habitación a «mantenimiento»
            automáticamente.
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setDialogOpen(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={createIssue} disabled={saving}>
            {saving ? "Guardando…" : "Cargar problema"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
