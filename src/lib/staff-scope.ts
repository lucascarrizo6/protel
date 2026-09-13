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
  // Super Admin no pertenece a ningún hotel (hotelId siempre null): no
  // administra la operación de un hotel puntual, administra la plataforma.
  SUPER_ADMIN: "/dashboard/super-admin",
};

export function getScopedHome(role: UserRole | undefined): string | null {
  if (!role) return null;
  return SCOPED_ROLE_HOME[role] ?? null;
}

/**
 * Mismo criterio que getScopedHome, pero para usar en endpoints de API en
 * vez de páginas: true si este rol puede pedir/tocar datos generales del
 * hotel (reservas, grupos, etc.), false si es un rol de área única
 * (Mucama, Mantenimiento, Super Admin) que no debería poder llamar a esas
 * rutas ni aunque sepa la URL.
 */
export function isGeneralAccessRole(role: UserRole | undefined): boolean {
  return getScopedHome(role) === null;
}
