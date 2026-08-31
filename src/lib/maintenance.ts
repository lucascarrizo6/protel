import type {
  MaintenanceSeverity,
  MaintenanceStatus,
} from "@/generated/prisma/enums";
import type { UserRole } from "@/generated/prisma/enums";

export const MAINTENANCE_SEVERITIES = [
  "ROJO",
  "NARANJA",
  "AMARILLO",
] as const satisfies readonly MaintenanceSeverity[];

export const MAINTENANCE_STATUSES = [
  "ABIERTO",
  "RESUELTO",
] as const satisfies readonly MaintenanceStatus[];

const SEVERITY_LABELS: Record<MaintenanceSeverity, string> = {
  ROJO: "Rojo",
  NARANJA: "Naranja",
  AMARILLO: "Amarillo",
};

/** Qué significa cada color — se muestra en la leyenda de arriba. */
export const SEVERITY_MEANING: Record<MaintenanceSeverity, string> = {
  ROJO: "Habitación inutilizable, no se puede vender. Si hay alguien de mantenimiento en el lugar, avisale ya.",
  NARANJA: "Se puede usar, pero hay que arreglarlo pronto. Avisá a mantenimiento apenas puedas.",
  AMARILLO: "Problema menor, puede esperar. Queda anotado para cuando haya tiempo.",
};

/** 0 = más grave. Sirve para ordenar y para pintar la habitación con su peor problema. */
export const SEVERITY_ORDER: Record<MaintenanceSeverity, number> = {
  ROJO: 0,
  NARANJA: 1,
  AMARILLO: 2,
};

export const SEVERITY_BADGE_CLASS: Record<MaintenanceSeverity, string> = {
  ROJO: "border-transparent bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
  NARANJA:
    "border-transparent bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-400",
  AMARILLO:
    "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400",
};

export const SEVERITY_LEFT_BORDER: Record<MaintenanceSeverity, string> = {
  ROJO: "border-l-red-500",
  NARANJA: "border-l-orange-500",
  AMARILLO: "border-l-yellow-400",
};

export const SEVERITY_DOT: Record<MaintenanceSeverity, string> = {
  ROJO: "bg-red-500",
  NARANJA: "bg-orange-500",
  AMARILLO: "bg-yellow-400",
};

export function formatSeverity(severity: MaintenanceSeverity): string {
  return SEVERITY_LABELS[severity];
}

/** Rojo y naranja sacan la habitación de servicio (pasa a MANTENIMIENTO). */
export function severityBlocksRoom(severity: MaintenanceSeverity): boolean {
  return severity === "ROJO" || severity === "NARANJA";
}

/** Quiénes pueden ver y gestionar la pestaña de Mantenimiento. */
export const MAINTENANCE_ROLES: readonly UserRole[] = [
  "SUPER_ADMIN",
  "HOTEL_ADMIN",
  "RECEPTIONIST",
  "MAINTENANCE",
];

export function canManageMaintenance(role: UserRole): boolean {
  return MAINTENANCE_ROLES.includes(role);
}
