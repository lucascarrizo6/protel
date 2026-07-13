import type { InvoiceStatus } from "@/generated/prisma/enums";

export const INVOICE_STATUSES = [
  "PENDIENTE",
  "PAGADA",
  "CANCELADA",
] as const satisfies readonly InvoiceStatus[];

const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  PENDIENTE: "Pendiente",
  PAGADA: "Pagada",
  CANCELADA: "Cancelada",
};

const INVOICE_STATUS_BADGE_CLASSES: Record<InvoiceStatus, string> = {
  PENDIENTE:
    "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400",
  PAGADA:
    "border-transparent bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
  CANCELADA:
    "border-transparent bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
};

export function formatInvoiceStatus(status: InvoiceStatus): string {
  return INVOICE_STATUS_LABELS[status];
}

export function invoiceStatusBadgeClassName(status: InvoiceStatus): string {
  return INVOICE_STATUS_BADGE_CLASSES[status];
}
