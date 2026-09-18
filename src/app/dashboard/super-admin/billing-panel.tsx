"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format-date";
import {
  BILLING_STATUSES,
  BILLING_STATUS_BADGE_CLASS,
  BILLING_STATUS_LABELS,
} from "@/lib/super-admin";
import type { BillingStatus } from "@/generated/prisma/enums";

export type HotelBillingDTO = {
  plan: string | null;
  monto: number | null;
  status: BillingStatus;
  ultimoPago: string | null;
  proximoVencimiento: string | null;
  notas: string | null;
} | null;

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function BillingPanel({
  hotelId,
  hotelNombre,
  billing,
  onUpdated,
}: {
  hotelId: string;
  hotelNombre: string;
  billing: HotelBillingDTO;
  onUpdated: (billing: NonNullable<HotelBillingDTO>) => void;
}) {
  const [plan, setPlan] = useState(billing?.plan ?? "");
  const [monto, setMonto] = useState(
    billing?.monto != null ? String(billing.monto) : ""
  );
  const [status, setStatus] = useState<BillingStatus>(
    billing?.status ?? "PENDIENTE"
  );
  const [proximoVencimiento, setProximoVencimiento] = useState(
    toDateInputValue(billing?.proximoVencimiento)
  );
  const [notas, setNotas] = useState(billing?.notas ?? "");
  const [saving, setSaving] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  // Si cambiás de hotel seleccionado, el formulario tiene que refeljar los
  // datos del nuevo, no arrastrar lo que había tipeado para el anterior.
  useEffect(() => {
    setPlan(billing?.plan ?? "");
    setMonto(billing?.monto != null ? String(billing.monto) : "");
    setStatus(billing?.status ?? "PENDIENTE");
    setProximoVencimiento(toDateInputValue(billing?.proximoVencimiento));
    setNotas(billing?.notas ?? "");
  }, [hotelId, billing]);

  async function save() {
    setSaving(true);
    try {
      const response = await fetch(
        `/api/super-admin/hotels/${hotelId}/billing`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan,
            monto: monto.trim() === "" ? null : Number(monto),
            status,
            proximoVencimiento,
            notas,
          }),
        }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "No se pudo guardar.");
      onUpdated(data);
      toast.success("Facturación actualizada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function markPaid() {
    setMarkingPaid(true);
    try {
      const response = await fetch(
        `/api/super-admin/hotels/${hotelId}/billing`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "marcar_pagado" }),
        }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo registrar el pago.");
      }
      onUpdated(data);
      toast.success("Pago registrado.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo registrar el pago."
      );
    } finally {
      setMarkingPaid(false);
    }
  }

  const currentStatus = billing?.status ?? "PENDIENTE";

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Facturación de {hotelNombre}</CardTitle>
          <CardDescription>
            Lo que este hotel te paga a vos por usar Hotar — no lo confundas
            con su Facturación AFIP, que es lo que él le cobra a sus
            huéspedes.
          </CardDescription>
        </div>
        <Badge className={BILLING_STATUS_BADGE_CLASS[currentStatus]}>
          {BILLING_STATUS_LABELS[currentStatus]}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="billing-plan">Plan</Label>
            <Input
              id="billing-plan"
              value={plan}
              onChange={(event) => setPlan(event.target.value)}
              placeholder="Ej: Plan Mensual"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="billing-monto">Monto</Label>
            <Input
              id="billing-monto"
              type="number"
              min="0"
              step="0.01"
              value={monto}
              onChange={(event) => setMonto(event.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="billing-status">Estado</Label>
            <Select
              value={status}
              onValueChange={(value) => value && setStatus(value as BillingStatus)}
            >
              <SelectTrigger id="billing-status">
                <SelectValue>
                  {(value: BillingStatus | null) =>
                    value ? BILLING_STATUS_LABELS[value] : ""
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {BILLING_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {BILLING_STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="billing-venc">Próximo vencimiento</Label>
            <Input
              id="billing-venc"
              type="date"
              value={proximoVencimiento}
              onChange={(event) => setProximoVencimiento(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="billing-notas">Notas</Label>
          <Textarea
            id="billing-notas"
            rows={2}
            value={notas}
            onChange={(event) => setNotas(event.target.value)}
            placeholder="Cualquier cosa que quieras recordar sobre este cliente"
          />
        </div>

        {billing?.ultimoPago ? (
          <p className="text-xs text-muted-foreground">
            Último pago registrado: {formatDate(new Date(billing.ultimoPago))}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
          <Button variant="outline" onClick={markPaid} disabled={markingPaid}>
            {markingPaid ? "Registrando…" : "Marcar pagado este mes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
