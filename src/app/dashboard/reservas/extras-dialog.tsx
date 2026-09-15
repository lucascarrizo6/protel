"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format-currency";
import {
  parseExtras,
  sumExtras,
  type ExtraCharge,
} from "@/lib/reservation-extras";
import type { ReservationWithRoom } from "./reservations-view";

type ExtrasDialogProps = {
  reservation: ReservationWithRoom | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: ReservationWithRoom) => void;
};

export function ExtrasDialog({
  reservation,
  onOpenChange,
  onSaved,
}: ExtrasDialogProps) {
  const [extrasDraft, setExtrasDraft] = useState<ExtraCharge[]>(() =>
    reservation ? parseExtras(reservation.extras) : []
  );
  const [extraNombre, setExtraNombre] = useState("");
  const [extraMonto, setExtraMonto] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extrasTotal = sumExtras(extrasDraft);

  function addExtraDraft() {
    const monto = Number(extraMonto);
    if (!extraNombre.trim() || !Number.isFinite(monto) || monto < 0) {
      setError("Completa nombre y monto válidos.");
      return;
    }
    setExtrasDraft((prev) => [
      ...prev,
      { nombre: extraNombre.trim(), monto },
    ]);
    setExtraNombre("");
    setExtraMonto("");
    setError(null);
  }

  function removeExtraDraft(index: number) {
    setExtrasDraft((prev) => prev.filter((_, i) => i !== index));
  }

  async function save() {
    if (!reservation) return;
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/reservations/${reservation.id}/extras`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ extras: extrasDraft }),
        }
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudieron guardar los extras.");
      }

      onSaved({
        ...(data as ReservationWithRoom),
        groupMember: reservation.groupMember,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron guardar los extras."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={reservation !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Cargos extras {reservation ? `· ${reservation.guestName}` : ""}
          </DialogTitle>
          <DialogDescription>
            Minibar, desayuno, toallas u otros cargos que se suman al total
            de la factura.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {extrasDraft.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {extrasDraft.map((extra, index) => (
                <li
                  key={`${extra.nombre}-${index}`}
                  className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm"
                >
                  <span>{extra.nombre}</span>
                  <span className="flex items-center gap-2">
                    {formatCurrency(extra.monto)}
                    <button
                      type="button"
                      onClick={() => removeExtraDraft(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-3.5" />
                      <span className="sr-only">Quitar</span>
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Todavía no hay cargos extras.
            </p>
          )}

          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="extraNombre">Ítem</Label>
              <Input
                id="extraNombre"
                placeholder="Minibar, desayuno…"
                value={extraNombre}
                onChange={(event) => setExtraNombre(event.target.value)}
              />
            </div>
            <div className="flex w-28 flex-col gap-1.5">
              <Label htmlFor="extraMonto">Monto</Label>
              <Input
                id="extraMonto"
                type="number"
                min="0"
                step="0.01"
                value={extraMonto}
                onChange={(event) => setExtraMonto(event.target.value)}
              />
            </div>
            <Button type="button" size="icon" onClick={addExtraDraft}>
              <Plus className="size-4" />
              <span className="sr-only">Agregar ítem</span>
            </Button>
          </div>

          {extrasDraft.length > 0 ? (
            <p className="text-right text-sm font-medium">
              Total extras: {formatCurrency(extrasTotal)}
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button onClick={save} disabled={isSaving}>
            {isSaving ? "Guardando…" : "Guardar extras"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
