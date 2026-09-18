"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CalendarReservation } from "@/lib/calendar-reservation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  dateKey,
  formatMonthKey,
  getTodayKey,
  parseMonthKey,
} from "./calendar-date-utils";
import { DayDetailSheet } from "./day-detail-sheet";
import { MiniCalendar, type DayBucket } from "./mini-calendar";
import { OccupancyGrid, type RoomSlim } from "./occupancy-grid";

export function CalendarView({
  rooms,
  initialReservations,
  initialMonth,
}: {
  rooms: RoomSlim[];
  initialReservations: CalendarReservation[];
  initialMonth: string;
}) {
  const [monthKey, setMonthKey] = useState(initialMonth);
  const [reservations, setReservations] = useState(initialReservations);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const isFirstRender = useRef(true);

  const { year, month } = parseMonthKey(monthKey);
  const monthDate = useMemo(() => new Date(year, month - 1, 1), [year, month]);
  const daysInMonth = useMemo(
    () => new Date(year, month, 0).getDate(),
    [year, month]
  );
  // Se calcula una sola vez al montar: mantiene la misma referencia entre
  // renders para no romper el React.memo de MiniCalendar/OccupancyGrid.
  const todayKey = useMemo(() => getTodayKey(), []);

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
        if (!cancelled) setReservations(data as CalendarReservation[]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [monthKey]);

  const goToMonth = useCallback((offset: number) => {
    setMonthKey((current) => {
      const { year, month } = parseMonthKey(current);
      const next = new Date(year, month - 1 + offset, 1);
      return formatMonthKey(next.getFullYear(), next.getMonth() + 1);
    });
  }, []);

  const onPrevMonth = useCallback(() => goToMonth(-1), [goToMonth]);
  const onNextMonth = useCallback(() => goToMonth(1), [goToMonth]);
  const onSelectDay = useCallback((day: Date) => setSelectedDate(day), []);
  const onSheetOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedDate(null);
  }, []);

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
    const map = new Map<string, CalendarReservation[]>();
    for (const reservation of reservations) {
      if (!reservation.roomId) continue;
      const list = map.get(reservation.roomId) ?? [];
      list.push(reservation);
      map.set(reservation.roomId, list);
    }
    return map;
  }, [reservations]);

  const selectedDayReservations = useMemo(() => {
    if (!selectedDate) return [];
    const bucket = dayBuckets.get(dateKey(selectedDate));
    if (!bucket) return [];
    return [...bucket.checkIns, ...bucket.checkOuts, ...bucket.staying].sort(
      (a, b) => (a.room?.number ?? "").localeCompare(b.room?.number ?? "")
    );
  }, [selectedDate, dayBuckets]);

  return (
    <div className="flex flex-col gap-6">
      <MiniCalendar
        monthDate={monthDate}
        month={month}
        gridDays={gridDays}
        dayBuckets={dayBuckets}
        todayKey={todayKey}
        isLoading={isLoading}
        onSelectDay={onSelectDay}
        onPrevMonth={onPrevMonth}
        onNextMonth={onNextMonth}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vista de ocupación</CardTitle>
        </CardHeader>
        <CardContent>
          <OccupancyGrid
            rooms={rooms}
            reservationsByRoom={reservationsByRoom}
            year={year}
            month={month}
            daysInMonth={daysInMonth}
            todayKey={todayKey}
          />
        </CardContent>
      </Card>

      <DayDetailSheet
        selectedDate={selectedDate}
        reservations={selectedDayReservations}
        onOpenChange={onSheetOpenChange}
      />
    </div>
  );
}
