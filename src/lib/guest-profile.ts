import type { DocumentType } from "@/generated/prisma/enums";

export type GuestProfileDTO = {
  dni: string;
  documentType: DocumentType;
  prefRecepcion: string | null;
  prefMucama: string | null;
  prefCocina: string | null;
  vip: boolean;
  vipMotivo: string | null;
};

export function guestProfileKey(
  documentType: DocumentType,
  dni: string
): string {
  return `${documentType}:${dni}`;
}

/** ¿Tiene algo que valga la pena avisarle a recepción antes del check-in? */
export function guestProfileHasNotice(
  profile: GuestProfileDTO | null | undefined
): boolean {
  if (!profile) return false;
  return (
    profile.vip ||
    Boolean(profile.prefRecepcion?.trim()) ||
    Boolean(profile.prefMucama?.trim()) ||
    Boolean(profile.prefCocina?.trim())
  );
}

export const GUEST_PREF_AREAS = [
  { key: "prefRecepcion", label: "Recepción" },
  { key: "prefMucama", label: "Mucama" },
  { key: "prefCocina", label: "Cocina" },
] as const;
