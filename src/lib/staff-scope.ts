import type { UserRole } from "@/generated/prisma/enums";

/**
 * Roles que solo deben ver SU área, sin importar qué módulos tenga
 * activados el hotel. Mapea rol -> a qué pantalla mandarlo si intenta
 * entrar a cualquier otra parte del panel (aunque sea escribiendo la URL
 * a mano).
 */
const SCOPED_ROLE_HOME: Partial<Record<UserRole, string>> = {
  HOUSEKEEPING: "/dashboard/mucama",
  MAINTENANCE: "/dashboard/mantenimiento",
};

export function getScopedHome(role: UserRole | undefined): string | null {
  if (!role) return null;
  return SCOPED_ROLE_HOME[role] ?? null;
}
