import type { DocumentType } from "@/generated/prisma/enums";

export const DOCUMENT_TYPES = [
  "DNI",
  "PASAPORTE",
] as const satisfies readonly DocumentType[];

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  DNI: "DNI",
  PASAPORTE: "Pasaporte",
};

export function formatDocumentType(type: DocumentType): string {
  return DOCUMENT_TYPE_LABELS[type];
}

export function formatDocument(type: DocumentType, number: string): string {
  return `${formatDocumentType(type)} ${number}`;
}
