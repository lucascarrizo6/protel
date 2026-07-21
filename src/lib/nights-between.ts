export function nightsBetween(checkIn: Date, checkOut: Date): number {
  const nights = Math.round(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(nights, 1);
}
