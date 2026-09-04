"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type {
  MaintenanceSeverity,
  MaintenanceStatus,
} from "@/generated/prisma/enums";
import { formatDate } from "@/lib/format-date";
import {
  MAINTENANCE_SEVERITIES,
  SEVERITY_BADGE_CLASS,
  SEVERITY_DOT,
  SEVERITY_LEFT_BORDER,
  SEVERITY_MEANING,
  SEVERITY_ORDER,
  formatSeverity,
} from "@/lib/maintenance";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

export type MaintenanceIssueDTO = {
  id: string;
  titulo: string;
  detalle: string | null;
  severity: MaintenanceSeverity;
  status: MaintenanceStatus;
  reportadoPor: string | null;
  resueltoPor: string | null;
  createdAt: string;
  resolvedAt: string | null;
  roomNumber: string;
  roomFloor: number;
};

type RoomOption = { id: string; number: string; floor: number };

type RoomGroup = {
  key: string;
  roomNumber: string;
  roomFloor: number;
  worstOrder: number;
  worstSeverity: MaintenanceSeverity;
  issues: MaintenanceIssueDTO[];
};

export function MaintenanceView({
  openIssues,
  resolvedIssues,
  rooms,
  currentUserName,
}: {
  openIssues: MaintenanceIssueDTO[];
  resolvedIssues: MaintenanceIssueDTO[];
  rooms: RoomOption[];
  currentUserName: string;
}) {
  const router = useRouter();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [closingIssue, setClosingIssue] = useState<MaintenanceIssueDTO | null>(null);
  const [closeType, setCloseType] = useState<"ANULAR" | "COMPROBANTE" | null>(null);
  
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [roomId, setRoomId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [severity, setSeverity] = useState<MaintenanceSeverity | "">("");
  const [reportadoPor, setReportadoPor] = useState(currentUserName);
  const [formError, setFormError] = useState<string | null>(null);

  const [closeMotivo, setCloseMotivo] = useState("");
  const [closeCosto, setCloseCosto] = useState("");
  const [closeReceipt, setCloseReceipt] = useState("");

  const roomGroups = useMemo<RoomGroup[]>(() => {
    const map = new Map<string, RoomGroup>();
    for (const issue of openIssues) {
      const key = `${issue.roomFloor}-${issue.roomNumber}`;
      const order = SEVERITY_ORDER[issue.severity];
      const existing = map.get(key);
      if (existing) {
        existing.issues.push(issue);
        if (order < existing.worstOrder) {
          existing.worstOrder = order;
          existing.worstSeverity = issue.severity;
        }
      } else {
        map.set(key, {
          key,
          roomNumber: issue.roomNumber,
          roomFloor: issue.roomFloor,
          worstOrder: order,
          worstSeverity: issue.severity,
          issues: [issue],
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        a.worstOrder - b.worstOrder ||
        a.roomNumber.localeCompare(b.roomNumber, "es", { numeric: true })
    );
  }, [openIssues]);

  function resetForm() {
    setRoomId("");
    setTitulo("");
    setDetalle("");
    setSeverity("");
    setReportadoPor(currentUserName);
    setFormError(null);
  }

  function resetCloseForm() {
    setClosingIssue(null);
    setCloseType(null);
    setCloseMotivo("");
    setCloseCosto("");
    setCloseReceipt("");
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
      if (!response.ok) throw new Error(data?.error ?? "No se pudo cargar el problema.");
      
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

  async function submitCloseIssue() {
    if (!closingIssue) return;
    if (closeType === "ANULAR" && !closeMotivo.trim()) {
      return toast.error("Debes ingresar un motivo para anular el reporte.");
    }
    if (closeType === "COMPROBANTE" && !closeMotivo.trim()) {
      return toast.error("Debes ingresar el detalle de lo realizado.");
    }

    setSaving(true);
    try {
      let actionNote = "";
      if (closeType === "ANULAR") {
        actionNote = `Reporte anulado: ${closeMotivo}`;
      } else {
        const costoStr = closeCosto ? `Costo: $${closeCosto} | ` : "";
        actionNote = `${costoStr}Detalle: ${closeMotivo}`;
      }

      const response = await fetch(`/api/maintenance/${closingIssue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "RESUELTO", 
          actionNote,
          receiptUrl: closeReceipt || undefined
        }),
      });
      
      if (!response.ok) throw new Error("Error al cerrar el problema");
      
      toast.success(closeType === "ANULAR" ? "Reporte anulado." : "Problema cerrado y archivado.");
      resetCloseForm();
      router.refresh();
    } catch (err) {
      toast.error("No se pudo actualizar el problema.");
    } finally {
      setSaving(false);
    }
  }

  async function reopenIssue(id: string) {
    setBusyId(id);
    try {
      const response = await fetch(`/api/maintenance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PENDIENTE" }),
      });
      if (!response.ok) throw new Error("No se pudo reabrir.");
      
      toast.success("Ticket reabierto.");
      router.refresh();
    } catch (err) {
      toast.error("No se pudo actualizar.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Dialog open={!!closingIssue} onOpenChange={(open) => { if (!open) resetCloseForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {closeType === "ANULAR" ? "Anular Reporte" : "Liquidar y Cerrar Problema"}
            </DialogTitle>
            <DialogDescription>
              Hab. {closingIssue?.roomNumber} - {closingIssue?.titulo}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            {closeType === "ANULAR" ? (
              <div className="flex flex-col gap-2">
                <Label>Motivo de la anulación</Label>
                <Textarea
                  placeholder="Ej: El huésped avisó que se solucionó solo, o fue un error al cargar la habitación..."
                  value={closeMotivo}
                  onChange={(e) => setCloseMotivo(e.target.value)}
                />
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <Label>Costo de reparación ($) - Opcional</Label>
                  <Input
                    type="number"
                    placeholder="Ej: 15000"
                    value={closeCosto}
                    onChange={(e) => setCloseCosto(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Detalle de lo realizado</Label>
                  <Textarea
                    placeholder="Ej: Se cambió la plaqueta del aire acondicionado..."
                    value={closeMotivo}
                    onChange={(e) => setCloseMotivo(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Link al Remito / Factura (Opcional)</Label>
                  <Input
                    placeholder="https://drive.google.com/..."
                    value={closeReceipt}
                    onChange={(e) => setCloseReceipt(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Podés pegar un link a Google Drive con la foto del comprobante o transferencia.
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetCloseForm} disabled={saving}>
              Cancelar
            </Button>
            <Button 
              variant={closeType === "ANULAR" ? "destructive" : "default"}
              onClick={submitCloseIssue} 
              disabled={saving}
            >
              {saving ? "Procesando..." : closeType === "ANULAR" ? "Confirmar Anulación" : "Confirmar Cierre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Cómo se usan los colores</h2>
          <Dialog
            open={dialogOpen}
            onOpenChange={(next) => {
              setDialogOpen(next);
              if (!next) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">Nuevo problema</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo problema de mantenimiento</DialogTitle>
                <DialogDescription>
                  Queda anotado en la habitación hasta que alguien lo marque como arreglado.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="mnt-room">Habitación</Label>
                  <Select value={roomId} onValueChange={(value) => setRoomId(value ?? "")}>
                    <SelectTrigger id="mnt-room" className="w-full">
                      <SelectValue placeholder="Elegí una habitación" />
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
                  Rojo y naranja pasan la habitación a «mantenimiento» automáticamente.
                </p>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={createIssue} disabled={saving}>
                  {saving ? "Guardando…" : "Cargar problema"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <ul className="flex flex-col gap-1.5 text-sm">
          {MAINTENANCE_SEVERITIES.map((sev) => (
            <li key={sev} className="flex items-start gap-2">
              <span className={cn("mt-1 size-2.5 shrink-0 rounded-full", SEVERITY_DOT[sev])} />
              <span>
                <span className="font-medium">{formatSeverity(sev)}:</span>{" "}
                <span className="text-muted-foreground">{SEVERITY_MEANING[sev]}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Problemas abiertos ({openIssues.length})
        </h2>
        {roomGroups.length === 0 ? (
          <Card className="px-4 py-10 text-center text-sm text-muted-foreground">
            No hay problemas abiertos. Todo en orden.
          </Card>
        ) : (
          roomGroups.map((group) => (
            <Card
              key={group.key}
              className={cn("flex flex-col gap-3 border-l-4 p-4", SEVERITY_LEFT_BORDER[group.worstSeverity])}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold">Hab. {group.roomNumber}</span>
                <span className="text-sm text-muted-foreground">Piso {group.roomFloor}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {group.issues.length} problema{group.issues.length === 1 ? "" : "s"}
                </span>
              </div>

              <ul className="flex flex-col divide-y rounded-md border">
                {group.issues.map((issue) => (
                  <li key={issue.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={SEVERITY_BADGE_CLASS[issue.severity]}>
                          {formatSeverity(issue.severity)}
                        </Badge>
                        
                        <Badge variant="outline" className={
                          issue.status === "EN_REVISION" ? "border-blue-300 text-blue-700 bg-blue-50" :
                          issue.status === "DERIVADO" ? "border-purple-300 text-purple-700 bg-purple-50" :
                          "border-gray-300 text-gray-700 bg-gray-50"
                        }>
                          {issue.status.replace("_", " ")}
                        </Badge>

                        <span className="text-sm font-medium">{issue.titulo}</span>
                      </div>
                      
                      {issue.detalle && (
                        <p className="mt-1 text-sm text-muted-foreground">{issue.detalle}</p>
                      )}
                      
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(new Date(issue.createdAt))}
                        {issue.reportadoPor ? ` · reportó ${issue.reportadoPor}` : ""}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {issue.status === "DERIVADO" ? (
                        <Button
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                          onClick={() => { setClosingIssue(issue); setCloseType("COMPROBANTE"); }}
                        >
                          Cargar comprobante y cerrar
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive border-dashed"
                          onClick={() => { setClosingIssue(issue); setCloseType("ANULAR"); }}
                        >
                          Anular reporte
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))
        )}
      </div>

      {resolvedIssues.length > 0 && (
        <details className="group flex flex-col gap-3">
          <summary className="cursor-pointer text-sm font-semibold text-muted-foreground marker:content-['']">
            <span className="group-open:hidden">▸ </span>
            <span className="hidden group-open:inline">▾ </span>
            Historial de arreglos ({resolvedIssues.length})
          </summary>
          <Card className="mt-3 divide-y">
            {resolvedIssues.map((issue) => (
              <div key={issue.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                <span className={cn("size-2 shrink-0 rounded-full", SEVERITY_DOT[issue.severity])} />
                <span className="font-medium">Hab. {issue.roomNumber}</span>
                <span>{issue.titulo}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  arreglado {issue.resolvedAt ? formatDate(new Date(issue.resolvedAt)) : "—"}
                  {issue.resueltoPor ? ` · ${issue.resueltoPor}` : ""}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  disabled={busyId === issue.id}
                  onClick={() => reopenIssue(issue.id)}
                >
                  Reabrir
                </Button>
              </div>
            ))}
          </Card>
        </details>
      )}
    </div>
  );
}
