import type { HousekeepingStatus } from "@/generated/prisma/enums";

export const HOUSEKEEPING_STATUSES = [
  "PENDIENTE",
  "EN_PROGRESO",
  "COMPLETADA",
] as const satisfies readonly HousekeepingStatus[];

const HOUSEKEEPING_STATUS_LABELS: Record<HousekeepingStatus, string> = {
  PENDIENTE: "Pendiente",
  EN_PROGRESO: "En progreso",
  COMPLETADA: "Completada",
};

export function formatHousekeepingStatus(status: HousekeepingStatus): string {
  return HOUSEKEEPING_STATUS_LABELS[status];
}
