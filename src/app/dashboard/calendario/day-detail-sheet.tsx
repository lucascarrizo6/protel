"use client";

import type { CalendarReservation } from "@/lib/calendar-reservation";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { isSameDay } from "./calendar-date-utils";

// A diferencia de formatDate (que fuerza UTC para fechas guardadas como
// checkIn/checkOut), selectedDate es una celda de la grilla armada en hora
// local, así que se formatea en hora local para no correrse un día.
const LOCAL_DAY_LABEL_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

type ReservationDayType = "Entrada" | "Salida" | "Estancia";

const TYPE_BADGE_CLASSES: Record<ReservationDayType, string> = {
  Entrada:
    "border-transparent bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
  Salida:
    "border-transparent bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
  Estancia:
    "border-transparent bg-slate-100 text-slate-800 dark:bg-slate-500/15 dark:text-slate-400",
};

function reservationTypeForDay(
  reservation: CalendarReservation,
  day: Date
): ReservationDayType {
  if (isSameDay(new Date(reservation.checkIn), day)) return "Entrada";
  if (isSameDay(new Date(reservation.checkOut), day)) return "Salida";
  return "Estancia";
}

type DayDetailSheetProps = {
  selectedDate: Date | null;
  reservations: CalendarReservation[];
  onOpenChange: (open: boolean) => void;
};

export function DayDetailSheet({
  selectedDate,
  reservations,
  onOpenChange,
}: DayDetailSheetProps) {
  return (
    <Sheet open={selectedDate !== null} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {selectedDate ? LOCAL_DAY_LABEL_FORMATTER.format(selectedDate) : ""}
          </SheetTitle>
          <SheetDescription>Reservas con actividad ese día.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-2 overflow-y-auto px-4 pb-4">
          {reservations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay reservas para este día.
            </p>
          ) : (
            reservations.map((reservation) => {
              const type = selectedDate
                ? reservationTypeForDay(reservation, selectedDate)
                : "Estancia";
              return (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between gap-2 rounded-md border p-2.5 text-sm"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{reservation.guestName}</span>
                    <span className="text-xs text-muted-foreground">
                      Hab. {reservation.room?.number ?? "—"} ·{" "}
                      {reservation.room?.type ?? "—"}
                    </span>
                  </div>
                  <Badge className={TYPE_BADGE_CLASSES[type]}>{type}</Badge>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
