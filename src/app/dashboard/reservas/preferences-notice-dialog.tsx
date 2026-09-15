"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GuestPreferencesNotice } from "@/components/dashboard/guest-preferences-notice";
import type { GuestProfileDTO } from "@/lib/guest-profile";
import type { ReservationWithRoom } from "./reservations-view";

type PreferencesNoticeDialogProps = {
  reservation: ReservationWithRoom | null;
  profile: GuestProfileDTO | null;
  onOpenChange: (open: boolean) => void;
  onContinue: (reservation: ReservationWithRoom) => void;
};

export function PreferencesNoticeDialog({
  reservation,
  profile,
  onOpenChange,
  onContinue,
}: PreferencesNoticeDialogProps) {
  return (
    <Dialog open={reservation !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Antes del check-in de {reservation?.guestName}
          </DialogTitle>
          <DialogDescription>
            Este huésped tiene indicaciones cargadas. Tenelas presentes al
            recibirlo.
          </DialogDescription>
        </DialogHeader>

        {reservation ? <GuestPreferencesNotice profile={profile} /> : null}

        <DialogFooter>
          <Button
            onClick={() => {
              if (reservation) onContinue(reservation);
            }}
          >
            Entendido, seguir al cobro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
