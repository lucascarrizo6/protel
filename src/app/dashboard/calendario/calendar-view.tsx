"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Reservation, Room } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";

type ReservationWithRoom = Reservation & { room: Room };

type DayBucket = {
  checkIns: ReservationWithRoom[];
  checkOuts: ReservationWithRoom[];
  staying: ReservationWithRoom[];
};

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
});

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function parseMonthKey(monthKey: string): { year: number; month: number } {
  const [year, month] = monthKey.split("-").map(Number);
  return { year, month };
}

function formatMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function clampDayOfMonth(
  date: Date,
  year: number,
  month: number,
  daysInMonth: number
): number {
  const monthIndex = month - 1;
  if (
    date.getFullYear() < year ||
    (date.getFullYear() === year && date.getMonth() < monthIndex)
  ) {
    return 1;
  }
  if (
    date.getFullYear() > year ||
    (date.getFullYear() === year && date.getMonth() > monthIndex)
  ) {
    return daysInMonth;
  }
  return date.getDate();
}

function reservationTypeForDay(
  reservation: ReservationWithRoom,
  day: Date
): "Entrada" | "Salida" | "Estancia" {
  if (isSameDay(new Date(reservation.checkIn), day)) return "Entrada";
  if (isSameDay(new Date(reservation.checkOut), day)) return "Salida";
  return "Estancia";
}

const TYPE_BADGE_CLASSES: Record<"Entrada" | "Salida" | "Estancia", string> = {
  Entrada:
    "border-transparent bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
  Salida:
    "border-transparent bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
  Estancia:
    "border-transparent bg-slate-100 text-slate-800 dark:bg-slate-500/15 dark:text-slate-400",
};

export function CalendarView({
  rooms,
  initialReservations,
  initialMonth,
}: {
  rooms: Room[];
  initialReservations: ReservationWithRoom[];
  initialMonth: string;
}) {
  const [monthKey, setMonthKey] = useState(initialMonth);
  const [reservations, setReservations] = useState(initialReservations);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const isFirstRender = useRef(true);

  const { year, month } = parseMonthKey(monthKey);
  const monthDate = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetch(`/api/reservations?month=${monthKey}`)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setReservations(data as ReservationWithRoom[]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [monthKey]);

  function goToMonth(offset: number) {
    const next = new Date(year, month - 1 + offset, 1);
    setMonthKey(formatMonthKey(next.getFullYear(), next.getMonth() + 1));
  }

  const gridDays = useMemo(() => {
    const firstOfMonth = new Date(year, month - 1, 1);
    const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
    const gridStart = new Date(year, month - 1, 1 - firstWeekday);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + i);
      days.push(day);
    }
    if (days[35].getMonth() !== month - 1 || days[35].getFullYear() !== year) {
      return days.slice(0, 35);
    }
    return days;
  }, [year, month]);

  const dayBuckets = useMemo(() => {
    const map = new Map<string, DayBucket>();

    function bucketFor(key: string): DayBucket {
      let bucket = map.get(key);
      if (!bucket) {
        bucket = { checkIns: [], checkOuts: [], staying: [] };
        map.set(key, bucket);
      }
      return bucket;
    }

    for (const day of gridDays) {
      bucketFor(dateKey(day));
    }

    for (const reservation of reservations) {
      const checkIn = new Date(reservation.checkIn);
      const checkOut = new Date(reservation.checkOut);

      bucketFor(dateKey(checkIn)).checkIns.push(reservation);
      bucketFor(dateKey(checkOut)).checkOuts.push(reservation);

      const cursor = new Date(
        checkIn.getFullYear(),
        checkIn.getMonth(),
        checkIn.getDate() + 1
      );
      const end = new Date(
        checkOut.getFullYear(),
        checkOut.getMonth(),
        checkOut.getDate()
      );
      while (cursor < end) {
        bucketFor(dateKey(cursor)).staying.push(reservation);
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    return map;
  }, [reservations, gridDays]);

  const reservationsByRoom = useMemo(() => {
    const map = new Map<string, ReservationWithRoom[]>();
    for (const reservation of reservations) {
      const list = map.get(reservation.roomId) ?? [];
      list.push(reservation);
      map.set(reservation.roomId, list);
    }
    return map;
  }, [reservations]);

  const selectedBucket = selectedDate
    ? dayBuckets.get(dateKey(selectedDate))
    : null;
  const selectedDayReservations = selectedBucket
    ? [
        ...selectedBucket.checkIns,
        ...selectedBucket.checkOuts,
        ...selectedBucket.staying,
      ].sort((a, b) => a.room.number.localeCompare(b.room.number))
    : [];

  const monthLabel = MONTH_LABEL_FORMATTER.format(monthDate);
  const today = new Date();

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-lg capitalize">{monthLabel}</CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-green-500" /> Entradas
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-red-500" /> Salidas
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-slate-400" /> Ocupadas
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => goToMonth(-1)}
                disabled={isLoading}
              >
                <ChevronLeft className="size-4" />
                <span className="sr-only">Mes anterior</span>
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => goToMonth(1)}
                disabled={isLoading}
              >
                <ChevronRight className="size-4" />
                <span className="sr-only">Mes siguiente</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="py-1">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {gridDays.map((day) => {
              const inMonth = day.getMonth() === month - 1;
              const bucket = dayBuckets.get(dateKey(day)) ?? {
                checkIns: [],
                checkOuts: [],
                staying: [],
              };
              const isToday = isSameDay(day, today);
              return (
                <button
                  key={dateKey(day)}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "flex min-h-20 flex-col items-start gap-1 rounded-md border p-1.5 text-left text-xs transition-colors hover:bg-muted",
                    !inMonth && "opacity-40",
                    isToday && "border-primary"
                  )}
                >
                  <span className="text-sm font-medium">{day.getDate()}</span>
                  <div className="flex flex-col gap-0.5">
                    {bucket.checkIns.length > 0 ? (
                      <span className="flex items-center gap-1 text-green-700 dark:text-green-400">
                        <span className="size-1.5 shrink-0 rounded-full bg-green-500" />
                        {bucket.checkIns.length}
                      </span>
                    ) : null}
                    {bucket.checkOuts.length > 0 ? (
                      <span className="flex items-center gap-1 text-red-700 dark:text-red-400">
                        <span className="size-1.5 shrink-0 rounded-full bg-red-500" />
                        {bucket.checkOuts.length}
                      </span>
                    ) : null}
                    {bucket.staying.length > 0 ? (
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <span className="size-1.5 shrink-0 rounded-full bg-slate-400" />
                        {bucket.staying.length}
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vista de ocupación</CardTitle>
        </CardHeader>
        <CardContent>
          {rooms.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay habitaciones cargadas.
            </p>
          ) : (
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
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                  (dayNumber) => {
                    const isTodayCol =
                      today.getFullYear() === year &&
                      today.getMonth() === month - 1 &&
                      today.getDate() === dayNumber;
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
                  }
                )}

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
                      {Array.from({ length: daysInMonth }, (_, i) => (
                        <div
                          key={i}
                          className="border-r border-b"
                          style={{ gridColumn: i + 2, gridRow }}
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
                          <div
                            key={reservation.id}
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
                      })}
                    </Fragment>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet
        open={selectedDate !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedDate(null);
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {selectedDate ? formatDate(selectedDate) : ""}
            </SheetTitle>
            <SheetDescription>
              Reservas con actividad ese día.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-2 overflow-y-auto px-4 pb-4">
            {selectedDayReservations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay reservas para este día.
              </p>
            ) : (
              selectedDayReservations.map((reservation) => {
                const type = selectedDate
                  ? reservationTypeForDay(reservation, selectedDate)
                  : "Estancia";
                return (
                  <div
                    key={reservation.id}
                    className="flex items-center justify-between gap-2 rounded-md border p-2.5 text-sm"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">
                        {reservation.guestName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Hab. {reservation.room.number} ·{" "}
                        {reservation.room.type}
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
    </div>
  );
}
