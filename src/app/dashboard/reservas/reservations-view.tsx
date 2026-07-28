"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import type {
  GroupMember,
  Reservation,
  Room,
} from "@/generated/prisma/client";
import type { DocumentType, PaymentMethod } from "@/generated/prisma/enums";
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
  formatReservationStatus,
  reservationStatusBadgeClassName,
} from "@/lib/reservation-status";
import {
  parseExtras,
  sumExtras,
  type ExtraCharge,
} from "@/lib/reservation-extras";
import { nightsBetween } from "@/lib/nights-between";
import { DOCUMENT_TYPES, formatDocumentType } from "@/lib/document-type";
import { PAYMENT_METHODS, formatPaymentMethod } from "@/lib/payment-method";

type ReservationWithRoom = Reservation & {
  room: Room;
  groupMember: GroupMember | null;
};

function isCheckInAllowed(reservation: ReservationWithRoom): boolean {
  if (reservation.status !== "PENDIENTE") return false;
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return new Date(reservation.checkIn) <= endOfToday;
}

export function ReservationsView({
  initialReservations,
  rooms,
}: {
  initialReservations: ReservationWithRoom[];
  rooms: Room[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reservations, setReservations] = useState(initialReservations);
  const [open, setOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [dni, setDni] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType>("DNI");
  const [roomId, setRoomId] = useState<string>("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [actionErrorId, setActionErrorId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const [extrasReservation, setExtrasReservation] =
    useState<ReservationWithRoom | null>(null);
  const [extrasDraft, setExtrasDraft] = useState<ExtraCharge[]>([]);
  const [extraNombre, setExtraNombre] = useState("");
  const [extraMonto, setExtraMonto] = useState("");
  const [isSavingExtras, setIsSavingExtras] = useState(false);
  const [extrasError, setExtrasError] = useState<string | null>(null);

  const [checkinReservation, setCheckinReservation] =
    useState<ReservationWithRoom | null>(null);
  const [checkinPaymentMethod, setCheckinPaymentMethod] =
    useState<PaymentMethod | "">("");
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [isRedirectingToMp, setIsRedirectingToMp] = useState(false);

  const [checkoutReservation, setCheckoutReservation] =
    useState<ReservationWithRoom | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    const pago = searchParams.get("pago");
    if (!pago) return;

    // Se difiere al siguiente tick: en el montaje inicial de la página
    // este efecto corre antes de que <Toaster/> suscriba su listener,
    // así que un toast disparado de forma síncrona aquí se pierde.
    const timeout = setTimeout(() => {
      if (pago === "exitoso") {
        toast.success("Pago con MercadoPago confirmado.");
      } else if (pago === "fallido") {
        toast.error("El pago con MercadoPago no pudo completarse.");
      } else if (pago === "pendiente") {
        toast.info("El pago con MercadoPago quedó pendiente.");
      }

      router.replace("/dashboard/reservas");
    }, 100);

    return () => clearTimeout(timeout);
  }, [searchParams, router]);

  function resetForm() {
    setGuestName("");
    setDni("");
    setDocumentType("DNI");
    setRoomId("");
    setCheckIn("");
    setCheckOut("");
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

    if (!roomId) {
      setError("Selecciona una habitación.");
      return;
    }

    if (checkOut <= checkIn) {
      setError("La fecha de salida debe ser posterior a la de entrada.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName,
          dni,
          documentType,
          roomId,
          checkIn,
          checkOut,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Request failed");
      }

      const created = (await response.json()) as ReservationWithRoom;
      setReservations((prev) =>
        [...prev, created].sort(
          (a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime()
        )
      );
      setOpen(false);
    } catch {
      setError("No se pudo crear la reserva. Inténtalo de nuevo.");
    } finally {
      setIsSaving(false);
    }
  }

  function updateReservation(updated: ReservationWithRoom) {
    setReservations((prev) =>
      prev.map((reservation) =>
        reservation.id === updated.id ? updated : reservation
      )
    );
  }

  function openCheckIn(reservation: ReservationWithRoom) {
    setCheckinReservation(reservation);
    setCheckinPaymentMethod("");
    setCheckinError(null);
    setIsRedirectingToMp(false);
  }

  async function confirmCheckIn() {
    if (!checkinReservation) return;

    if (!checkinPaymentMethod) {
      setCheckinError("Selecciona un método de pago.");
      return;
    }

    setIsCheckingIn(true);
    setCheckinError(null);

    try {
      const response = await fetch(
        `/api/reservations/${checkinReservation.id}/check-in`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentMethod: checkinPaymentMethod }),
        }
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo hacer el check-in.");
      }

      updateReservation(data as ReservationWithRoom);
      setCheckinReservation(null);
    } catch (err) {
      setCheckinError(
        err instanceof Error ? err.message : "No se pudo hacer el check-in."
      );
    } finally {
      setIsCheckingIn(false);
    }
  }

  async function payWithMercadoPago() {
    if (!checkinReservation) return;

    setCheckinError(null);
    setIsRedirectingToMp(true);

    try {
      const response = await fetch("/api/mercadopago/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto: checkinAmount,
          concepto: `Alojamiento · Habitación ${checkinReservation.room.number} · ${checkinReservation.guestName}`,
          reservaId: checkinReservation.id,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.init_point) {
        throw new Error(
          data?.error ?? "No se pudo iniciar el pago con MercadoPago."
        );
      }

      window.location.href = data.init_point;
    } catch (err) {
      setCheckinError(
        err instanceof Error
          ? err.message
          : "No se pudo iniciar el pago con MercadoPago."
      );
      setIsRedirectingToMp(false);
    }
  }

  async function performCheckOut(reservation: ReservationWithRoom) {
    const response = await fetch(
      `/api/reservations/${reservation.id}/check-out`,
      { method: "PATCH" }
    );
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error ?? "No se pudo hacer el check-out.");
    }

    updateReservation(data as ReservationWithRoom);
  }

  async function handleCheckOut(reservation: ReservationWithRoom) {
    const extras = parseExtras(reservation.extras);

    if (extras.length === 0) {
      setActionErrorId(null);
      setActionError(null);
      setPendingActionId(reservation.id);

      try {
        await performCheckOut(reservation);
      } catch (err) {
        setActionErrorId(reservation.id);
        setActionError(
          err instanceof Error ? err.message : "No se pudo hacer el check-out."
        );
      } finally {
        setPendingActionId(null);
      }
      return;
    }

    setCheckoutReservation(reservation);
    setCheckoutError(null);
  }

  async function confirmCheckOut() {
    if (!checkoutReservation) return;

    setIsCheckingOut(true);
    setCheckoutError(null);

    try {
      await performCheckOut(checkoutReservation);
      setCheckoutReservation(null);
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "No se pudo hacer el check-out."
      );
    } finally {
      setIsCheckingOut(false);
    }
  }

  function openExtras(reservation: ReservationWithRoom) {
    setExtrasReservation(reservation);
    setExtrasDraft(parseExtras(reservation.extras));
    setExtraNombre("");
    setExtraMonto("");
    setExtrasError(null);
  }

  function addExtraDraft() {
    const monto = Number(extraMonto);
    if (!extraNombre.trim() || !Number.isFinite(monto) || monto < 0) {
      setExtrasError("Completa nombre y monto válidos.");
      return;
    }
    setExtrasDraft((prev) => [
      ...prev,
      { nombre: extraNombre.trim(), monto },
    ]);
    setExtraNombre("");
    setExtraMonto("");
    setExtrasError(null);
  }

  function removeExtraDraft(index: number) {
    setExtrasDraft((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveExtras() {
    if (!extrasReservation) return;
    setIsSavingExtras(true);
    setExtrasError(null);

    try {
      const response = await fetch(
        `/api/reservations/${extrasReservation.id}/extras`,
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

      updateReservation({
        ...(data as ReservationWithRoom),
        groupMember: extrasReservation.groupMember,
      });
      setExtrasReservation(null);
    } catch (err) {
      setExtrasError(
        err instanceof Error
          ? err.message
          : "No se pudieron guardar los extras."
      );
    } finally {
      setIsSavingExtras(false);
    }
  }

  const extrasTotalDraft = sumExtras(extrasDraft);

  const checkinNights = checkinReservation
    ? nightsBetween(
        new Date(checkinReservation.checkIn),
        new Date(checkinReservation.checkOut)
      )
    : 0;
  const checkinAmount = checkinReservation?.groupMember?.esFree
    ? 0
    : checkinNights * (checkinReservation?.room.pricePerNight ?? 0);

  const checkoutExtras = checkoutReservation
    ? parseExtras(checkoutReservation.extras)
    : [];
  const checkoutExtrasTotal = sumExtras(checkoutExtras);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button size="sm" />}>
            Nueva reserva
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit} className="contents">
              <DialogHeader>
                <DialogTitle>Nueva reserva</DialogTitle>
                <DialogDescription>
                  Completa los datos para crear una nueva reserva.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="guestName">Nombre del huésped</Label>
                  <Input
                    id="guestName"
                    required
                    value={guestName}
                    onChange={(event) => setGuestName(event.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="dni">Documento</Label>
                  <div className="flex gap-2">
                    <Select
                      value={documentType}
                      onValueChange={(value) =>
                        setDocumentType((value as DocumentType | null) ?? "DNI")
                      }
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue>
                          {(value: DocumentType | null) =>
                            value ? formatDocumentType(value) : "Tipo"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {formatDocumentType(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="dni"
                      required
                      className="flex-1"
                      value={dni}
                      onChange={(event) => setDni(event.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="roomId">Habitación</Label>
                  <Select
                    value={roomId}
                    onValueChange={(value) => setRoomId(value ?? "")}
                  >
                    <SelectTrigger id="roomId" className="w-full">
                      <SelectValue placeholder="Selecciona una habitación">
                        {(value: string | null) => {
                          const room = rooms.find(
                            (candidate) => candidate.id === value
                          );
                          return room
                            ? `Habitación ${room.number} · ${room.type}`
                            : "Selecciona una habitación";
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          Habitación {room.number} · {room.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="checkIn">Check-in</Label>
                    <Input
                      id="checkIn"
                      type="date"
                      required
                      value={checkIn}
                      onChange={(event) => setCheckIn(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="checkOut">Check-out</Label>
                    <Input
                      id="checkOut"
                      type="date"
                      required
                      value={checkOut}
                      onChange={(event) => setCheckOut(event.target.value)}
                    />
                  </div>
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
                  {isSaving ? "Creando…" : "Crear reserva"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {reservations.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aún no hay reservas</CardTitle>
            <CardDescription>
              Las reservas de tu hotel aparecerán aquí una vez que se agreguen.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Huésped</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Habitación</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Extras</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.map((reservation) => {
                const extras = parseExtras(reservation.extras);
                const isPending = pendingActionId === reservation.id;
                return (
                  <TableRow key={reservation.id}>
                    <TableCell className="font-medium">
                      {reservation.guestName}
                      {reservation.groupMember?.esFree ? (
                        <Badge variant="secondary" className="ml-2">
                          FREE
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {formatDocumentType(reservation.documentType)}{" "}
                      {reservation.dni}
                    </TableCell>
                    <TableCell>{reservation.room.number}</TableCell>
                    <TableCell>
                      {formatDate(new Date(reservation.checkIn))}
                    </TableCell>
                    <TableCell>
                      {formatDate(new Date(reservation.checkOut))}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openExtras(reservation)}
                      >
                        {extras.length > 0
                          ? formatCurrency(sumExtras(extras))
                          : "Agregar"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={reservationStatusBadgeClassName(
                          reservation.status
                        )}
                      >
                        {formatReservationStatus(reservation.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex justify-end gap-2">
                          {isCheckInAllowed(reservation) ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-600/30 bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-500/15 dark:text-green-400 dark:hover:bg-green-500/25"
                              disabled={isPending}
                              onClick={() => openCheckIn(reservation)}
                            >
                              Check-in
                            </Button>
                          ) : null}
                          {reservation.status === "CONFIRMADA" ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={isPending}
                              onClick={() => handleCheckOut(reservation)}
                            >
                              Check-out
                            </Button>
                          ) : null}
                        </div>
                        {actionErrorId === reservation.id && actionError ? (
                          <p role="alert" className="text-xs text-destructive">
                            {actionError}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog
        open={extrasReservation !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setExtrasReservation(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Cargos extras {extrasReservation ? `· ${extrasReservation.guestName}` : ""}
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
                Total extras: {formatCurrency(extrasTotalDraft)}
              </p>
            ) : null}

            {extrasError ? (
              <p role="alert" className="text-sm text-destructive">
                {extrasError}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExtrasReservation(null)}
              disabled={isSavingExtras}
            >
              Cancelar
            </Button>
            <Button onClick={saveExtras} disabled={isSavingExtras}>
              {isSavingExtras ? "Guardando…" : "Guardar extras"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={checkinReservation !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setCheckinReservation(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cobro de alojamiento</DialogTitle>
            <DialogDescription>
              Confirma el pago para hacer check-in de{" "}
              {checkinReservation?.guestName}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              Habitación {checkinReservation?.room.number} · {checkinNights}{" "}
              noche(s)
              {checkinReservation?.groupMember?.esFree ? (
                <span className="ml-2">
                  <Badge variant="secondary">Cortesía de grupo (FREE)</Badge>
                </span>
              ) : null}
              <p className="mt-1 text-base font-semibold text-foreground">
                {formatCurrency(checkinAmount)}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="checkinPaymentMethod">Método de pago</Label>
              <Select
                value={checkinPaymentMethod}
                onValueChange={(value) =>
                  setCheckinPaymentMethod((value as PaymentMethod | null) ?? "")
                }
              >
                <SelectTrigger id="checkinPaymentMethod" className="w-full">
                  <SelectValue placeholder="Selecciona un método de pago">
                    {(value: PaymentMethod | null) =>
                      value ? formatPaymentMethod(value) : "Selecciona un método de pago"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {formatPaymentMethod(method)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {checkinAmount > 0 ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                o
                <div className="h-px flex-1 bg-border" />
              </div>
            ) : null}

            {checkinAmount > 0 ? (
              <Button
                type="button"
                variant="outline"
                className="w-full border-sky-600/30 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:hover:bg-sky-500/20"
                onClick={payWithMercadoPago}
                disabled={isRedirectingToMp || isCheckingIn}
              >
                {isRedirectingToMp
                  ? "Redirigiendo a MercadoPago…"
                  : "Pagar con MercadoPago"}
              </Button>
            ) : null}

            {checkinError ? (
              <p role="alert" className="text-sm text-destructive">
                {checkinError}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCheckinReservation(null)}
              disabled={isCheckingIn || isRedirectingToMp}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmCheckIn}
              disabled={isCheckingIn || isRedirectingToMp}
            >
              {isCheckingIn ? "Confirmando…" : "Confirmar pago y check-in"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={checkoutReservation !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setCheckoutReservation(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cobro de consumos</DialogTitle>
            <DialogDescription>
              Resumen de extras cargados durante la estadía de{" "}
              {checkoutReservation?.guestName}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-1.5">
              {checkoutExtras.map((extra, index) => (
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
              Total consumos: {formatCurrency(checkoutExtrasTotal)}
            </p>

            {checkoutError ? (
              <p role="alert" className="text-sm text-destructive">
                {checkoutError}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCheckoutReservation(null)}
              disabled={isCheckingOut}
            >
              Cancelar
            </Button>
            <Button onClick={confirmCheckOut} disabled={isCheckingOut}>
              {isCheckingOut ? "Confirmando…" : "Confirmar pago y check-out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
