import type { AfipAmbiente, TipoFacturaAfip } from "@/generated/prisma/enums";

export const TIPOS_FACTURA_AFIP = [
  "A",
  "B",
  "C",
] as const satisfies readonly TipoFacturaAfip[];

const TIPO_FACTURA_LABELS: Record<TipoFacturaAfip, string> = {
  A: "Factura A",
  B: "Factura B",
  C: "Factura C",
};

export function formatTipoFacturaAfip(tipo: TipoFacturaAfip): string {
  return TIPO_FACTURA_LABELS[tipo];
}

export const AFIP_AMBIENTES = [
  "SANDBOX",
  "PRODUCCION",
] as const satisfies readonly AfipAmbiente[];

const AMBIENTE_LABELS: Record<AfipAmbiente, string> = {
  SANDBOX: "Sandbox (pruebas)",
  PRODUCCION: "Producción",
};

export function formatAfipAmbiente(ambiente: AfipAmbiente): string {
  return AMBIENTE_LABELS[ambiente];
}

export function isValidCuit(value: string): boolean {
  return /^\d{11}$/.test(value);
}
