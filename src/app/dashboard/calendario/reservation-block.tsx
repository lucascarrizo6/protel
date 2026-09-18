"use client";

import { memo } from "react";
import type { CalendarReservation } from "@/lib/calendar-reservation";
import { formatDate } from "@/lib/format-date";

type ReservationBlockProps = {
  reservation: CalendarReservation;
  gridRow: number;
  startDay: number;
  endDay: number;
};

function ReservationBlockImpl({
  reservation,
  gridRow,
  startDay,
  endDay,
}: ReservationBlockProps) {
  return (
    <div
      className="mx-0.5 my-1 flex items-center truncate rounded bg-primary/80 px-1.5 text-[10px] font-medium text-primary-foreground"
      style={{
        gridColumn: `${startDay + 1} / ${endDay + 2}`,
        gridRow,
      }}
      title={`${reservation.guestName} · ${formatDate(
        new Date(reservation.checkIn)
      )} – ${formatDate(new Date(reservation.checkOut))}`}
    >
      {reservation.guestName}
    </div>
  );
}

export const ReservationBlock = memo(ReservationBlockImpl);
