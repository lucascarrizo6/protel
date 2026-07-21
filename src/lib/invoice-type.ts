import type { InvoiceType } from "@/generated/prisma/enums";

export const INVOICE_TYPES = [
  "ALOJAMIENTO",
  "CONSUMOS",
] as const satisfies readonly InvoiceType[];

const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  ALOJAMIENTO: "Alojamiento",
  CONSUMOS: "Consumos",
};

const INVOICE_TYPE_BADGE_CLASSES: Record<InvoiceType, string> = {
  ALOJAMIENTO:
    "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400",
  CONSUMOS:
    "border-transparent bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-400",
};

export function formatInvoiceType(type: InvoiceType): string {
  return INVOICE_TYPE_LABELS[type];
}

export function invoiceTypeBadgeClassName(type: InvoiceType): string {
  return INVOICE_TYPE_BADGE_CLASSES[type];
}
