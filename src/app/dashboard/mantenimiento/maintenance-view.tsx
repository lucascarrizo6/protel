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
  const [busyId, setBusyId] = useState<string | null>(null);

  // form state
  const [roomId, setRoomId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [severity, setSeverity] = useState<MaintenanceSeverity | "">("");
  const [reportadoPor, setReportadoPor] = useState(currentUserName);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo cargar el problema.");
      }
      toast.success("Problema cargado.");
      resetForm();
      setDialogOpen(false);
      router.refresh();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "No se pudo cargar el problema."
      );
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: MaintenanceStatus) {
    setBusyId(id);
    try {
      const response = await fetch(`/api/maintenance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo actualizar.");
      }
      toast.success(
        status === "RESUELTO" ? "Marcado como arreglado." : "Reabierto."
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Leyenda */}
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
            <DialogTrigger render={<Button size="sm" />}>
              Nuevo problema
            </DialogTrigger>
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
                  <Select
                    value={roomId}
                    onValueChange={(value) => setRoomId(value ?? "")}
                  >
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
                        <span
                          className={cn(
                            "size-2.5 rounded-full",
                            SEVERITY_DOT[sev]
                          )}
                        />
                        {formatSeverity(sev)}
                      </button>
                    ))}
                  </div>
                  {severity ? (
                    <p className="text-xs text-muted-foreground">
                      {SEVERITY_MEANING[severity]}
                    </p>
                  ) : null}
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

                {formError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {formError}
                  </p>
                ) : null}
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
        </div>

        <ul className="flex flex-col gap-1.5 text-sm">
          {MAINTENANCE_SEVERITIES.map((sev) => (
            <li key={sev} className="flex items-start gap-2">
              <span
                className={cn(
                  "mt-1 size-2.5 shrink-0 rounded-full",
                  SEVERITY_DOT[sev]
                )}
              />
              <span>
                <span className="font-medium">{formatSeverity(sev)}:</span>{" "}
                <span className="text-muted-foreground">
                  {SEVERITY_MEANING[sev]}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Si hay personal de mantenimiento en el lugar, hablá directamente con
          ellos según la gravedad; esta lista es el registro.
        </p>
      </Card>

      {/* Abiertos */}
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
              className={cn(
                "flex flex-col gap-3 border-l-4 p-4",
                SEVERITY_LEFT_BORDER[group.worstSeverity]
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold">
                  Hab. {group.roomNumber}
                </span>
                <span className="text-sm text-muted-foreground">
                  Piso {group.roomFloor}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {group.issues.length} problema
                  {group.issues.length === 1 ? "" : "s"}
                </span>
              </div>

              <ul className="flex flex-col divide-y rounded-md border">
                {group.issues.map((issue) => (
                  <li
                    key={issue.id}
                    className="flex flex-wrap items-start justify-between gap-3 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={SEVERITY_BADGE_CLASS[issue.severity]}>
                          {formatSeverity(issue.severity)}
                        </Badge>
                        <span className="text-sm font-medium">
                          {issue.titulo}
                        </span>
                      </div>
                      {issue.detalle ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {issue.detalle}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(new Date(issue.createdAt))}
                        {issue.reportadoPor
                          ? ` · reportó ${issue.reportadoPor}`
                          : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      disabled={busyId === issue.id}
                      onClick={() => setStatus(issue.id, "RESUELTO")}
                    >
                      {busyId === issue.id ? "…" : "Marcar arreglado"}
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          ))
        )}
      </div>

      {/* Historial */}
      {resolvedIssues.length > 0 ? (
        <details className="group flex flex-col gap-3">
          <summary className="cursor-pointer text-sm font-semibold text-muted-foreground marker:content-['']">
            <span className="group-open:hidden">▸ </span>
            <span className="hidden group-open:inline">▾ </span>
            Historial de arreglos ({resolvedIssues.length})
          </summary>
          <Card className="mt-3 divide-y">
            {resolvedIssues.map((issue) => (
              <div
                key={issue.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm"
              >
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    SEVERITY_DOT[issue.severity]
                  )}
                />
                <span className="font-medium">Hab. {issue.roomNumber}</span>
                <span>{issue.titulo}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  arreglado{" "}
                  {issue.resolvedAt
                    ? formatDate(new Date(issue.resolvedAt))
                    : "—"}
                  {issue.resueltoPor ? ` · ${issue.resueltoPor}` : ""}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  disabled={busyId === issue.id}
                  onClick={() => setStatus(issue.id, "ABIERTO")}
                >
                  Reabrir
                </Button>
              </div>
            ))}
          </Card>
        </details>
      ) : null}
    </div>
  );
}
