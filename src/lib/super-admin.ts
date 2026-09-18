import type { Hotel, HotelBilling, HotelModules } from "@/generated/prisma/client";
import type { BillingStatus } from "@/generated/prisma/enums";

export const BILLING_STATUSES = [
  "AL_DIA",
  "PENDIENTE",
  "VENCIDO",
] as const satisfies readonly BillingStatus[];

export const BILLING_STATUS_LABELS: Record<BillingStatus, string> = {
  AL_DIA: "Al día",
  PENDIENTE: "Pendiente",
  VENCIDO: "Vencido",
};

export const BILLING_STATUS_BADGE_CLASS: Record<BillingStatus, string> = {
  AL_DIA:
    "border-transparent bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
  PENDIENTE:
    "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400",
  VENCIDO:
    "border-transparent bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
};

export const HOTEL_MODULE_KEYS = [
  "mercadopago",
  "afip",
  "grupos",
  "mucama",
  "calendario",
  "reservas",
  "mantenimiento",
  "personal",
] as const;

export type HotelModuleKey = (typeof HOTEL_MODULE_KEYS)[number];

export const DEFAULT_HOTEL_MODULES: Record<HotelModuleKey, boolean> = {
  mercadopago: true,
  afip: true,
  grupos: true,
  mucama: true,
  calendario: true,
  reservas: true,
  mantenimiento: true,
  personal: true,
};

export const HOTEL_MODULE_LABELS: Record<HotelModuleKey, string> = {
  mercadopago: "MercadoPago",
  afip: "Facturación AFIP",
  grupos: "Grupos",
  mucama: "Mucama",
  calendario: "Calendario",
  reservas: "Reservas",
  mantenimiento: "Mantenimiento",
  personal: "Personal",
};

type HotelWithModulesAndCount = Hotel & {
  _count: { users: number };
  modules: HotelModules | null;
  billing: HotelBilling | null;
};

export function serializeHotel(hotel: HotelWithModulesAndCount) {
  return {
    id: hotel.id,
    nombre: hotel.name,
    activo: hotel.active,
    _count: { usuarios: hotel._count.users },
    modules: hotel.modules,
    billing: hotel.billing
      ? {
          plan: hotel.billing.plan,
          monto: hotel.billing.monto,
          status: hotel.billing.status,
          ultimoPago: hotel.billing.ultimoPago?.toISOString() ?? null,
          proximoVencimiento:
            hotel.billing.proximoVencimiento?.toISOString() ?? null,
          notas: hotel.billing.notas,
        }
      : null,
  };
}
