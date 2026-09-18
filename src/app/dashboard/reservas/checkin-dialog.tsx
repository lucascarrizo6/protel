"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format-currency";
import { nightsBetween } from "@/lib/nights-between";
import { PAYMENT_METHODS, formatPaymentMethod } from "@/lib/payment-method";
import type {
  ReservationWithRoom,
  RoomOption,
  SafeRoomOption,
} from "./reservations-view";

type CheckinDialogProps = {
  reservation: ReservationWithRoom | null;
  rooms: RoomOption[];
  onOpenChange: (open: boolean) => void;
  onCheckedIn: (updated: ReservationWithRoom) => void;
};

export function CheckinDialog({
  reservation,
  rooms,
  onOpenChange,
  onCheckedIn,
}: CheckinDialogProps) {
  const router = useRouter();
  const [checkinRoomId, setCheckinRoomId] = useState(
    reservation?.roomId ?? ""
  );
  const [checkinPaymentMethod, setCheckinPaymentMethod] = useState<
    PaymentMethod | ""
  >("");
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [isRedirectingToMp, setIsRedirectingToMp] = useState(false);
  const [safeRooms, setSafeRooms] = useState<SafeRoomOption[]>([]);
  const [isLoadingSafeRooms, setIsLoadingSafeRooms] = useState(false);

  useEffect(() => {
    if (!reservation) return;
    let cancelled = false;
    setIsLoadingSafeRooms(true);
    fetch(`/api/reservations/${reservation.id}/available-rooms`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setSafeRooms(data);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSafeRooms(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reservation]);

  const checkinNights = reservation
    ? nightsBetween(new Date(reservation.checkIn), new Date(reservation.checkOut))
    : 0;
  const selectedCheckinRoom = rooms.find((r) => r.id === checkinRoomId);
  const checkinAmount = reservation?.groupMember?.esFree
    ? 0
    : checkinNights * (selectedCheckinRoom?.pricePerNight ?? 0);

  async function confirmCheckIn() {
    if (!reservation) return;

    if (!checkinRoomId) {
      setCheckinError("Asigna una habitación física para hacer el check-in.");
      return;
    }

    if (!checkinPaymentMethod) {
      setCheckinError("Selecciona un método de pago.");
      return;
    }

    setIsCheckingIn(true);
    setCheckinError(null);

    try {
      const response = await fetch(
        `/api/reservations/${reservation.id}/check-in`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentMethod: checkinPaymentMethod,
            roomId: checkinRoomId,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo hacer el check-in.");
      }

      onCheckedIn(data as ReservationWithRoom);
      toast.success("Check-in completado y habitación asignada.");
      router.refresh();
    } catch (err) {
      setCheckinError(
        err instanceof Error ? err.message : "No se pudo hacer el check-in."
      );
    } finally {
      setIsCheckingIn(false);
    }
  }

  async function payWithMercadoPago() {
    if (!reservation) return;
    if (!checkinRoomId) {
      setCheckinError("Asigna una habitación física antes de cobrar.");
      return;
    }

    setCheckinError(null);
    setIsRedirectingToMp(true);

    try {
      const response = await fetch("/api/mercadopago/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservaId: reservation.id,
          roomId: checkinRoomId,
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

  return (
    <Dialog open={reservation !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignación y Cobro</DialogTitle>
          <DialogDescription>
            Asigná la habitación y confirmá el pago de{" "}
            {reservation?.guestName}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="checkinRoomId">Habitación Física</Label>
            <Select
              value={checkinRoomId}
              onValueChange={(value) => setCheckinRoomId(value ?? "")}
            >
              <SelectTrigger id="checkinRoomId" className="w-full">
                <SelectValue placeholder="Seleccioná dónde alojarlo">
                  {(value: string | null) => {
                    const room = rooms.find((r) => r.id === value);
                    return room
                      ? `Hab. ${room.number} (${room.type})`
                      : "Seleccioná dónde alojarlo";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {isLoadingSafeRooms ? (
                  <SelectItem value="loading" disabled>
                    Calculando disponibilidad...
                  </SelectItem>
                ) : (
                  <>
                    <SelectItem
                      value="header_1"
                      disabled
                      className="font-semibold text-primary"
                    >
                      --- Sugeridas ({reservation?.roomType}) ---
                    </SelectItem>
                    {safeRooms
                      .filter((r) => r.type === reservation?.roomType)
                      .map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          Hab. {room.number}{" "}
                          {room.status === "CLEANING" ? "(En limpieza)" : ""}
                        </SelectItem>
                      ))}
                    <SelectItem
                      value="header_2"
                      disabled
                      className="font-semibold text-primary mt-2"
                    >
                      --- Otras Disponibles (Upgrades) ---
                    </SelectItem>
                    {safeRooms
                      .filter((r) => r.type !== reservation?.roomType)
                      .map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          Hab. {room.number} ({room.type}){" "}
                          {room.status === "CLEANING" ? "- En limpieza" : ""}
                        </SelectItem>
                      ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border p-3 text-sm text-muted-foreground">
            Habitación {selectedCheckinRoom?.number ?? "A asignar"} ·{" "}
            {checkinNights} noche(s)
            {reservation?.groupMember?.esFree ? (
              <span className="ml-2">
                <Badge variant="secondary">Cortesía de grupo (FREE)</Badge>
              </span>
            ) : null}
            <p className="mt-1 text-base font-semibold text-foreground">
              {formatCurrency(checkinAmount)}
            </p>
            {!reservation?.groupMember?.esFree && selectedCheckinRoom ? (
              <p className="mt-0.5 text-xs">
                {checkinNights} noche(s) ×{" "}
                {formatCurrency(selectedCheckinRoom.pricePerNight)}.
              </p>
            ) : null}
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
                    value
                      ? formatPaymentMethod(value)
                      : "Selecciona un método de pago"
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
              <div className="h-px flex-1 bg-border" />o
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
            onClick={() => onOpenChange(false)}
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
  );
}
