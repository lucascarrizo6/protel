import type { UserRole } from "@/generated/prisma/enums";

/** Quién puede ver y gestionar la nómina de personal del hotel. */
export const EMPLOYEE_ROLES: readonly UserRole[] = ["HOTEL_ADMIN"];

export function canManageEmployees(role: UserRole | undefined): boolean {
  return !!role && EMPLOYEE_ROLES.includes(role);
}

/** Deja solo los dígitos de un CUIT/CUIL, sin importar cómo lo haya tipeado el usuario. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Un CUIT/CUIL válido tiene 11 dígitos (ej: 20-12345678-3). No valida el dígito verificador. */
export function isValidCuitCuil(value: string): boolean {
  return onlyDigits(value).length === 11;
}

/** Formatea 11 dígitos como XX-XXXXXXXX-X. Si no tiene 11 dígitos, devuelve tal cual vino. */
export function formatCuitCuil(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length !== 11) return value;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}
