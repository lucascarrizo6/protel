export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function parseMonthKey(monthKey: string): { year: number; month: number } {
  const [year, month] = monthKey.split("-").map(Number);
  return { year, month };
}

export function formatMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function clampDayOfMonth(
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

// Primitivos en vez de un objeto Date: un `new Date()` nuevo en cada render
// rompería la igualdad referencial de props que necesita React.memo.
export type TodayKey = { year: number; month: number; day: number };

export function getTodayKey(): TodayKey {
  const today = new Date();
  return {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
  };
}
