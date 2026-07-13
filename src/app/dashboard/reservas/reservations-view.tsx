"use client";

import { useState, type FormEvent } from "react";
import type { Reservation, Room } from "@/generated/prisma/client";
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
import {
  formatReservationStatus,
  reservationStatusBadgeClassName,
} from "@/lib/reservation-status";

type ReservationWithRoom = Reservation & { room: Room };

export function ReservationsView({
  initialReservations,
  rooms,
}: {
  initialReservations: ReservationWithRoom[];
  rooms: Room[];
}) {
  const [reservations, setReservations] = useState(initialReservations);
  const [open, setOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [dni, setDni] = useState("");
  const [roomId, setRoomId] = useState<string>("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setGuestName("");
    setDni("");
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
        body: JSON.stringify({ guestName, dni, roomId, checkIn, checkOut }),
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
                  <Label htmlFor="dni">DNI</Label>
                  <Input
                    id="dni"
                    required
                    value={dni}
                    onChange={(event) => setDni(event.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="roomId">Habitación</Label>
                  <Select
                    value={roomId}
                    onValueChange={(value) => setRoomId(value ?? "")}
                  >
                    <SelectTrigger id="roomId" className="w-full">
                      <SelectValue placeholder="Selecciona una habitación" />
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
                <TableHead>DNI</TableHead>
                <TableHead>Habitación</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.map((reservation) => (
                <TableRow key={reservation.id}>
                  <TableCell className="font-medium">
                    {reservation.guestName}
                  </TableCell>
                  <TableCell>{reservation.dni}</TableCell>
                  <TableCell>{reservation.room.number}</TableCell>
                  <TableCell>{formatDate(new Date(reservation.checkIn))}</TableCell>
                  <TableCell>{formatDate(new Date(reservation.checkOut))}</TableCell>
                  <TableCell>
                    <Badge
                      className={reservationStatusBadgeClassName(
                        reservation.status
                      )}
                    >
                      {formatReservationStatus(reservation.status)}
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
