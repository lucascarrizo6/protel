import type { RoomStatus } from "@/generated/prisma/enums";

export const ROOM_STATUSES = [
  "AVAILABLE",
  "OCCUPIED",
  "BLOCKED",
  "CLEANING",
  "MANTENIMIENTO",
] as const satisfies readonly RoomStatus[];

const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  AVAILABLE: "Disponible",
  OCCUPIED: "Ocupada",
  BLOCKED: "Bloqueada",
  CLEANING: "Limpieza",
  MANTENIMIENTO: "Mantenimiento",
};

const ROOM_STATUS_BADGE_CLASSES: Record<RoomStatus, string> = {
  AVAILABLE:
    "border-transparent bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
  OCCUPIED:
    "border-transparent bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
  BLOCKED:
    "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400",
  CLEANING:
    "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400",
  MANTENIMIENTO:
    "border-transparent bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
};

export function formatRoomStatus(status: RoomStatus): string {
  return ROOM_STATUS_LABELS[status];
}

export function roomStatusBadgeClassName(status: RoomStatus): string {
  return ROOM_STATUS_BADGE_CLASSES[status];
}
