"use client";

import { useState, type FormEvent } from "react";
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
import { formatDate } from "@/lib/format-date";
import type { InvoiceWithReservation, ReservationWithRoom } from "./invoices-view";

type CreateInvoiceDialogProps = {
  reservations: ReservationWithRoom[];
  onCreated: (invoice: InvoiceWithReservation) => void;
};

export function CreateInvoiceDialog({
  reservations,
  onCreated,
}: CreateInvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [reservationId, setReservationId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setReservationId("");
    setAmount("");
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      resetForm();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!reservationId) {
      setError("Selecciona una reserva.");
      return;
    }

    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue < 0) {
      setError("Ingresa un monto válido.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId, amount: amountValue }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Request failed");
      }

      const created = (await response.json()) as InvoiceWithReservation;
      onCreated(created);
      setOpen(false);
    } catch {
      setError("No se pudo crear la factura. Inténtalo de nuevo.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" />}>
        Nueva factura
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="contents">
          <DialogHeader>
            <DialogTitle>Nueva factura</DialogTitle>
            <DialogDescription>
              Vincula la factura a una reserva existente e indica el monto.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reservationId">Reserva</Label>
              <Select
                value={reservationId}
                onValueChange={(value) => setReservationId(value ?? "")}
              >
                <SelectTrigger id="reservationId" className="w-full">
                  <SelectValue placeholder="Selecciona una reserva" />
                </SelectTrigger>
                <SelectContent>
                  {reservations.map((reservation) => (
                    <SelectItem key={reservation.id} value={reservation.id}>
                      {reservation.guestName} · Habitación{" "}
                      {reservation.room?.number ?? "—"} ·{" "}
                      {formatDate(new Date(reservation.checkIn))} -{" "}
                      {formatDate(new Date(reservation.checkOut))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Monto (ARS)</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>

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
              onClick={() => setOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Creando…" : "Crear factura"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
