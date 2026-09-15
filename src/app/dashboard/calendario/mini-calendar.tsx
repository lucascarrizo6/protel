"use client";

import { memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarReservation } from "@/lib/calendar-reservation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { dateKey, type TodayKey } from "./calendar-date-utils";

export type DayBucket = {
  checkIns: CalendarReservation[];
  checkOuts: CalendarReservation[];
  staying: CalendarReservation[];
};

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
});

type MiniCalendarProps = {
  monthDate: Date;
  month: number;
  gridDays: Date[];
  dayBuckets: Map<string, DayBucket>;
  todayKey: TodayKey;
  isLoading: boolean;
  onSelectDay: (day: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

function MiniCalendarImpl({
  monthDate,
  month,
  gridDays,
  dayBuckets,
  todayKey,
  isLoading,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
}: MiniCalendarProps) {
  const monthLabel = MONTH_LABEL_FORMATTER.format(monthDate);

  return (
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
              onClick={onPrevMonth}
              disabled={isLoading}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Mes anterior</span>
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={onNextMonth}
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
            const isToday =
              todayKey.year === day.getFullYear() &&
              todayKey.month === day.getMonth() + 1 &&
              todayKey.day === day.getDate();
            return (
              <button
                key={dateKey(day)}
                type="button"
                onClick={() => onSelectDay(day)}
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
  );
}

export const MiniCalendar = memo(MiniCalendarImpl);
