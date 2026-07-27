import type { Hotel, HotelModules } from "@/generated/prisma/client";

export const HOTEL_MODULE_KEYS = [
  "mercadopago",
  "afip",
  "grupos",
  "mucama",
  "calendario",
  "reservas",
] as const;

export type HotelModuleKey = (typeof HOTEL_MODULE_KEYS)[number];

export const HOTEL_MODULE_LABELS: Record<HotelModuleKey, string> = {
  mercadopago: "MercadoPago",
  afip: "Facturación AFIP",
  grupos: "Grupos",
  mucama: "Mucama",
  calendario: "Calendario",
  reservas: "Reservas",
};

type HotelWithModulesAndCount = Hotel & {
  _count: { users: number };
  modules: HotelModules | null;
};

export function serializeHotel(hotel: HotelWithModulesAndCount) {
  return {
    id: hotel.id,
    nombre: hotel.name,
    activo: hotel.active,
    _count: { usuarios: hotel._count.users },
    modules: hotel.modules,
  };
}
