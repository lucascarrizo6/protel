"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format-currency";
import { parseExtras, sumExtras } from "@/lib/reservation-extras";
import type { ReservationWithRoom } from "./reservations-view";

type CheckoutDialogProps = {
  reservation: ReservationWithRoom | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reservation: ReservationWithRoom) => Promise<ReservationWithRoom>;
  onCheckedOut: (updated: ReservationWithRoom) => void;
};

export function CheckoutDialog({
  reservation,
  onOpenChange,
  onConfirm,
  onCheckedOut,
}: CheckoutDialogProps) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extras = reservation ? parseExtras(reservation.extras) : [];
  const extrasTotal = sumExtras(extras);

  async function confirm() {
    if (!reservation) return;
    setIsCheckingOut(true);
    setError(null);

    try {
      const updated = await onConfirm(reservation);
      onCheckedOut(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo hacer el check-out."
      );
    } finally {
      setIsCheckingOut(false);
    }
  }

  return (
    <Dialog open={reservation !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cobro de consumos</DialogTitle>
          <DialogDescription>
            Resumen de extras cargados durante la estadía de{" "}
            {reservation?.guestName}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-1.5">
            {extras.map((extra, index) => (
              <li
                key={`${extra.nombre}-${index}`}
                className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm"
              >
                <span>{extra.nombre}</span>
                <span>{formatCurrency(extra.monto)}</span>
              </li>
            ))}
          </ul>

          <p className="text-right text-sm font-medium">
            Total consumos: {formatCurrency(extrasTotal)}
          </p>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCheckingOut}
          >
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={isCheckingOut}>
            {isCheckingOut ? "Confirmando…" : "Confirmar pago y check-out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
