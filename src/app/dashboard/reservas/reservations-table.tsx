"use client";

import { memo } from "react";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { formatDocumentType } from "@/lib/document-type";
import {
  formatReservationStatus,
  reservationStatusBadgeClassName,
} from "@/lib/reservation-status";
import { parseExtras, sumExtras } from "@/lib/reservation-extras";
import { guestProfileKey, type GuestProfileDTO } from "@/lib/guest-profile";
import type { ReservationWithRoom } from "./reservations-view";

function isCheckInAllowed(reservation: ReservationWithRoom): boolean {
  if (reservation.status !== "PENDIENTE") return false;
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return new Date(reservation.checkIn) <= endOfToday;
}

type ReservationsTableProps = {
  reservations: ReservationWithRoom[];
  profileByKey: Map<string, GuestProfileDTO>;
  pendingActionId: string | null;
  actionErrorId: string | null;
  actionError: string | null;
  onStartCheckIn: (reservation: ReservationWithRoom) => void;
  onCheckOut: (reservation: ReservationWithRoom) => void;
  onOpenExtras: (reservation: ReservationWithRoom) => void;
};

function ReservationsTableImpl({
  reservations,
  profileByKey,
  pendingActionId,
  actionErrorId,
  actionError,
  onStartCheckIn,
  onCheckOut,
  onOpenExtras,
}: ReservationsTableProps) {
  if (reservations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aún no hay reservas</CardTitle>
          <CardDescription>
            Las reservas de tu hotel aparecerán aquí una vez que se agreguen.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="py-0 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Huésped</TableHead>
            <TableHead>Documento</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Habitación</TableHead>
            <TableHead className="whitespace-nowrap min-w-[140px]">
              Check-in
            </TableHead>
            <TableHead className="whitespace-nowrap min-w-[140px]">
              Check-out
            </TableHead>
            <TableHead>Extras</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.map((reservation) => {
            const extras = parseExtras(reservation.extras);
            const isPending = pendingActionId === reservation.id;
            const profile = profileByKey.get(
              guestProfileKey(reservation.documentType, reservation.dni)
            );
            return (
              <TableRow key={reservation.id}>
                <TableCell className="font-medium whitespace-nowrap">
                  {profile?.vip ? (
                    <Star
                      className="mr-1 inline size-3.5 -translate-y-px fill-amber-400 text-amber-400"
                      aria-label="Huésped VIP"
                    />
                  ) : null}
                  {reservation.guestName}
                  {reservation.groupMember?.esFree ? (
                    <Badge variant="secondary" className="ml-2">
                      FREE
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDocumentType(reservation.documentType)}{" "}
                  {reservation.dni}
                </TableCell>
                <TableCell>{reservation.roomType}</TableCell>
                <TableCell>
                  {reservation.room ? (
                    reservation.room.number
                  ) : (
                    <span className="italic text-muted-foreground">
                      A asignar
                    </span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap min-w-[140px]">
                  {formatDate(new Date(reservation.checkIn))}
                </TableCell>
                <TableCell className="whitespace-nowrap min-w-[140px]">
                  {formatDate(new Date(reservation.checkOut))}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenExtras(reservation)}
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
                          onClick={() => onStartCheckIn(reservation)}
                        >
                          Check-in
                        </Button>
                      ) : null}
                      {reservation.status === "CONFIRMADA" ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={isPending}
                          onClick={() => onCheckOut(reservation)}
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
  );
}

export const ReservationsTable = memo(ReservationsTableImpl);
