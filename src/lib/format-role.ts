import type { UserRole } from "@/generated/prisma/enums";

export const USER_ROLES = [
  "SUPER_ADMIN",
  "HOTEL_ADMIN",
  "RECEPTIONIST",
  "HOUSEKEEPING",
] as const satisfies readonly UserRole[];

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Administrador",
  HOTEL_ADMIN: "Administrador de Hotel",
  RECEPTIONIST: "Recepcionista",
  HOUSEKEEPING: "Mucama",
};

export function formatRole(role: UserRole): string {
  return ROLE_LABELS[role];
}
