import type { ReservationStatus } from "@/generated/prisma/enums";

export const RESERVATION_STATUSES = [
  "PENDIENTE",
  "CONFIRMADA",
  "CANCELADA",
  "COMPLETADA",
] as const satisfies readonly ReservationStatus[];

const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADA: "Confirmada",
  CANCELADA: "Cancelada",
  COMPLETADA: "Completada",
};

const RESERVATION_STATUS_BADGE_CLASSES: Record<ReservationStatus, string> = {
  PENDIENTE:
    "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400",
  CONFIRMADA:
    "border-transparent bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
  CANCELADA:
    "border-transparent bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
  COMPLETADA:
    "border-transparent bg-slate-100 text-slate-800 dark:bg-slate-500/15 dark:text-slate-400",
};

export function formatReservationStatus(status: ReservationStatus): string {
  return RESERVATION_STATUS_LABELS[status];
}

export function reservationStatusBadgeClassName(
  status: ReservationStatus
): string {
  return RESERVATION_STATUS_BADGE_CLASSES[status];
}
