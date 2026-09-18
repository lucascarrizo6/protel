"use client";

import { Fragment, memo, useMemo } from "react";
import type { Prisma } from "@/generated/prisma/client";
import type { CalendarReservation } from "@/lib/calendar-reservation";
import { cn } from "@/lib/utils";
import { clampDayOfMonth, type TodayKey } from "./calendar-date-utils";
import { ReservationBlock } from "./reservation-block";

export type RoomSlim = Prisma.RoomGetPayload<{
  select: { id: true; number: true };
}>;

type OccupancyGridProps = {
  rooms: RoomSlim[];
  reservationsByRoom: Map<string, CalendarReservation[]>;
  year: number;
  month: number;
  daysInMonth: number;
  todayKey: TodayKey;
};

function OccupancyGridImpl({
  rooms,
  reservationsByRoom,
  year,
  month,
  daysInMonth,
  todayKey,
}: OccupancyGridProps) {
  const dayNumbers = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );

  if (rooms.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay habitaciones cargadas.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `140px repeat(${daysInMonth}, minmax(28px, 1fr))`,
          gridAutoRows: "28px",
        }}
      >
        <div
          className="sticky left-0 z-20 border-b bg-card"
          style={{ gridColumn: 1, gridRow: 1 }}
        />
        {dayNumbers.map((dayNumber) => {
          const isTodayCol =
            todayKey.year === year &&
            todayKey.month === month &&
            todayKey.day === dayNumber;
          return (
            <div
              key={dayNumber}
              className={cn(
                "flex items-center justify-center border-b text-[10px] text-muted-foreground",
                isTodayCol && "bg-muted font-semibold text-foreground"
              )}
              style={{ gridColumn: dayNumber + 1, gridRow: 1 }}
            >
              {dayNumber}
            </div>
          );
        })}

        {rooms.map((room, rowIndex) => {
          const gridRow = rowIndex + 2;
          const roomReservations = reservationsByRoom.get(room.id) ?? [];
          return (
            <Fragment key={room.id}>
              <div
                className="sticky left-0 z-10 flex items-center border-r border-b bg-card pr-2 text-xs font-medium"
                style={{ gridColumn: 1, gridRow }}
              >
                Hab. {room.number}
              </div>
              {dayNumbers.map((dayNumber) => (
                <div
                  key={dayNumber}
                  className="border-r border-b"
                  style={{ gridColumn: dayNumber + 1, gridRow }}
                />
              ))}
              {roomReservations.map((reservation) => {
                const startDay = clampDayOfMonth(
                  new Date(reservation.checkIn),
                  year,
                  month,
                  daysInMonth
                );
                const endDay = clampDayOfMonth(
                  new Date(reservation.checkOut),
                  year,
                  month,
                  daysInMonth
                );
                return (
                  <ReservationBlock
                    key={reservation.id}
                    reservation={reservation}
                    gridRow={gridRow}
                    startDay={startDay}
                    endDay={endDay}
                  />
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

export const OccupancyGrid = memo(OccupancyGridImpl);
