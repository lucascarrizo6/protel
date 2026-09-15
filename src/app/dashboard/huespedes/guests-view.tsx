"use client";

import { useCallback, useState } from "react";
import type { DocumentType } from "@/generated/prisma/enums";
import type { GuestProfileDTO } from "@/lib/guest-profile";
import { GuestProfileSheet } from "./guest-profile-sheet";
import { GuestsTable } from "./guests-table";

export type GuestRowDTO = {
  dni: string;
  documentType: DocumentType;
  name: string;
  totalStays: number;
  lastVisit: string;
  totalSpent: number;
  profile: GuestProfileDTO | null;
};

export function GuestsView({ guests }: { guests: GuestRowDTO[] }) {
  const [selected, setSelected] = useState<GuestRowDTO | null>(null);

  const openGuest = useCallback((guest: GuestRowDTO) => {
    setSelected(guest);
  }, []);

  const closeSheet = useCallback((open: boolean) => {
    if (!open) setSelected(null);
  }, []);

  return (
    <>
      <GuestsTable guests={guests} onSelect={openGuest} />
      <GuestProfileSheet
        key={selected ? `${selected.documentType}:${selected.dni}` : "closed"}
        guest={selected}
        onOpenChange={closeSheet}
      />
    </>
  );
}
