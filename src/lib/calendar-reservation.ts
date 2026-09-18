import type { Prisma } from "@/generated/prisma/client";

export const RESERVATION_CALENDAR_SELECT = {
  id: true,
  guestName: true,
  checkIn: true,
  checkOut: true,
  roomId: true,
  room: { select: { number: true, type: true } },
} as const;

export type CalendarReservation = Prisma.ReservationGetPayload<{
  select: typeof RESERVATION_CALENDAR_SELECT;
}>;
