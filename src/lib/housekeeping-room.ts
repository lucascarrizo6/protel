import type { Prisma } from "@/generated/prisma/client";

export const HOUSEKEEPING_ROOM_SELECT = {
  id: true,
  number: true,
  floor: true,
  status: true,
  hotelId: true,
  housekeepingTask: {
    select: { limpiadaHoy: true, assignedToId: true, notes: true },
  },
} as const;

export const ACTIVE_RESERVATION_SELECT = {
  roomId: true,
  extras: true,
} as const;

export type ActiveReservationSlim = Prisma.ReservationGetPayload<{
  select: typeof ACTIVE_RESERVATION_SELECT;
}>;

export type HousekeepingRoom = Prisma.RoomGetPayload<{
  select: typeof HOUSEKEEPING_ROOM_SELECT;
}> & {
  activeReservation: ActiveReservationSlim | null;
};
