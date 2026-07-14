"use client";

import { useState, type FormEvent } from "react";
import type { Invoice, Reservation, Room } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format-date";
import { formatCurrency } from "@/lib/format-currency";
import {
  formatInvoiceStatus,
  invoiceStatusBadgeClassName,
} from "@/lib/invoice-status";

type ReservationWithRoom = Reservation & { room: Room };
type InvoiceWithReservation = Invoice & { reservation: ReservationWithRoom };

export function InvoicesView({
  initialInvoices,
  reservations,
}: {
  initialInvoices: InvoiceWithReservation[];
  reservations: ReservationWithRoom[];
}) {
  const [invoices, setInvoices] = useState(initialInvoices);
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
      setInvoices((prev) => [created, ...prev]);
      setOpen(false);
    } catch {
      setError("No se pudo crear la factura. Inténtalo de nuevo.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
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
                          {reservation.room.number} ·{" "}
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
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aún no hay facturas</CardTitle>
            <CardDescription>
              Las facturas de tu hotel aparecerán aquí una vez que se agreguen.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Huésped</TableHead>
                <TableHead>Habitación</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.reservation.guestName}
                  </TableCell>
                  <TableCell>{invoice.reservation.room.number}</TableCell>
                  <TableCell>
                    {formatDate(new Date(invoice.reservation.checkIn))}
                  </TableCell>
                  <TableCell>
                    {formatDate(new Date(invoice.reservation.checkOut))}
                  </TableCell>
                  <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                  <TableCell>
                    <Badge className={invoiceStatusBadgeClassName(invoice.status)}>
                      {formatInvoiceStatus(invoice.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
