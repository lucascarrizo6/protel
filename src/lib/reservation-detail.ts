import type { Prisma } from "@/generated/prisma/client";

export const RESERVATION_ROOM_GROUPMEMBER_INCLUDE = {
  room: { select: { number: true } },
  groupMember: { select: { esFree: true } },
} as const;

export type ReservationWithRoomAndGroupMember = Prisma.ReservationGetPayload<{
  include: typeof RESERVATION_ROOM_GROUPMEMBER_INCLUDE;
}>;
