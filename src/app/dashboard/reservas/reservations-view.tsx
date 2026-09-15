"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { Prisma } from "@/generated/prisma/client";
import type { ReservationWithRoomAndGroupMember } from "@/lib/reservation-detail";
import { parseExtras } from "@/lib/reservation-extras";
import {
  guestProfileHasNotice,
  guestProfileKey,
  type GuestProfileDTO,
} from "@/lib/guest-profile";
import { CreateReservationDialog } from "./create-reservation-dialog";
import { ExtrasDialog } from "./extras-dialog";
import { PreferencesNoticeDialog } from "./preferences-notice-dialog";
import { CheckinDialog } from "./checkin-dialog";
import { CheckoutDialog } from "./checkout-dialog";
import { ReservationsTable } from "./reservations-table";

export type ReservationWithRoom = ReservationWithRoomAndGroupMember;

export type RoomOption = Prisma.RoomGetPayload<{
  select: {
    id: true;
    number: true;
    type: true;
    status: true;
    pricePerNight: true;
  };
}>;

export type SafeRoomOption = Prisma.RoomGetPayload<{
  select: { id: true; number: true; type: true; status: true };
}>;

export function ReservationsView({
  initialReservations,
  rooms,
  guestProfiles,
}: {
  initialReservations: ReservationWithRoom[];
  rooms: RoomOption[];
  guestProfiles: GuestProfileDTO[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reservations, setReservations] = useState(initialReservations);

  const profileByKey = useMemo(
    () =>
      new Map(
        guestProfiles.map((profile) => [
          guestProfileKey(profile.documentType, profile.dni),
          profile,
        ])
      ),
    [guestProfiles]
  );

  const [actionErrorId, setActionErrorId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const [extrasReservation, setExtrasReservation] =
    useState<ReservationWithRoom | null>(null);
  const [prefsReservation, setPrefsReservation] =
    useState<ReservationWithRoom | null>(null);
  const [checkinReservation, setCheckinReservation] =
    useState<ReservationWithRoom | null>(null);
  const [checkoutReservation, setCheckoutReservation] =
    useState<ReservationWithRoom | null>(null);

  useEffect(() => {
    const pago = searchParams.get("pago");
    if (!pago) return;

    const timeout = setTimeout(() => {
      if (pago === "exitoso") {
        toast.success("Pago con MercadoPago confirmado.");
      } else if (pago === "fallido") {
        toast.error("El pago con MercadoPago no pudo completarse.");
      } else if (pago === "pendiente") {
        toast.info("El pago con MercadoPago quedó pendiente.");
      }

      router.replace("/dashboard/reservas");
    }, 100);

    return () => clearTimeout(timeout);
  }, [searchParams, router]);

  const updateReservation = useCallback((updated: ReservationWithRoom) => {
    setReservations((prev) =>
      prev.map((reservation) =>
        reservation.id === updated.id ? updated : reservation
      )
    );
  }, []);

  const handleCreated = useCallback((created: ReservationWithRoom) => {
    setReservations((prev) =>
      [...prev, created].sort(
        (a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime()
      )
    );
  }, []);

  const openCheckIn = useCallback((reservation: ReservationWithRoom) => {
    setCheckinReservation(reservation);
  }, []);

  const startCheckIn = useCallback(
    (reservation: ReservationWithRoom) => {
      const profile = profileByKey.get(
        guestProfileKey(reservation.documentType, reservation.dni)
      );
      if (guestProfileHasNotice(profile)) {
        setPrefsReservation(reservation);
      } else {
        openCheckIn(reservation);
      }
    },
    [profileByKey, openCheckIn]
  );

  const handlePrefsContinue = useCallback(
    (reservation: ReservationWithRoom) => {
      setPrefsReservation(null);
      openCheckIn(reservation);
    },
    [openCheckIn]
  );

  const performCheckOut = useCallback(
    async (reservation: ReservationWithRoom) => {
      const response = await fetch(
        `/api/reservations/${reservation.id}/check-out`,
        { method: "PATCH" }
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo hacer el check-out.");
      }

      return data as ReservationWithRoom;
    },
    []
  );

  const handleCheckOut = useCallback(
    async (reservation: ReservationWithRoom) => {
      const extras = parseExtras(reservation.extras);

      if (extras.length === 0) {
        setActionErrorId(null);
        setActionError(null);
        setPendingActionId(reservation.id);

        try {
          const updated = await performCheckOut(reservation);
          updateReservation(updated);
        } catch (err) {
          setActionErrorId(reservation.id);
          setActionError(
            err instanceof Error
              ? err.message
              : "No se pudo hacer el check-out."
          );
        } finally {
          setPendingActionId(null);
        }
        return;
      }

      setCheckoutReservation(reservation);
    },
    [performCheckOut, updateReservation]
  );

  const openExtras = useCallback((reservation: ReservationWithRoom) => {
    setExtrasReservation(reservation);
  }, []);

  const handleExtrasSaved = useCallback(
    (updated: ReservationWithRoom) => {
      updateReservation(updated);
      setExtrasReservation(null);
    },
    [updateReservation]
  );

  const handleCheckedIn = useCallback(
    (updated: ReservationWithRoom) => {
      updateReservation(updated);
      setCheckinReservation(null);
    },
    [updateReservation]
  );

  const handleCheckedOut = useCallback(
    (updated: ReservationWithRoom) => {
      updateReservation(updated);
      setCheckoutReservation(null);
    },
    [updateReservation]
  );

  const closeExtras = useCallback((open: boolean) => {
    if (!open) setExtrasReservation(null);
  }, []);

  const closePrefs = useCallback((open: boolean) => {
    if (!open) setPrefsReservation(null);
  }, []);

  const closeCheckin = useCallback((open: boolean) => {
    if (!open) setCheckinReservation(null);
  }, []);

  const closeCheckout = useCallback((open: boolean) => {
    if (!open) setCheckoutReservation(null);
  }, []);

  const prefsProfile = prefsReservation
    ? profileByKey.get(
        guestProfileKey(prefsReservation.documentType, prefsReservation.dni)
      ) ?? null
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <CreateReservationDialog rooms={rooms} onCreated={handleCreated} />
      </div>

      <ReservationsTable
        reservations={reservations}
        profileByKey={profileByKey}
        pendingActionId={pendingActionId}
        actionErrorId={actionErrorId}
        actionError={actionError}
        onStartCheckIn={startCheckIn}
        onCheckOut={handleCheckOut}
        onOpenExtras={openExtras}
      />

      <ExtrasDialog
        key={extrasReservation?.id ?? "extras-closed"}
        reservation={extrasReservation}
        onOpenChange={closeExtras}
        onSaved={handleExtrasSaved}
      />

      <PreferencesNoticeDialog
        reservation={prefsReservation}
        profile={prefsProfile}
        onOpenChange={closePrefs}
        onContinue={handlePrefsContinue}
      />

      <CheckinDialog
        key={checkinReservation?.id ?? "checkin-closed"}
        reservation={checkinReservation}
        rooms={rooms}
        onOpenChange={closeCheckin}
        onCheckedIn={handleCheckedIn}
      />

      <CheckoutDialog
        key={checkoutReservation?.id ?? "checkout-closed"}
        reservation={checkoutReservation}
        onOpenChange={closeCheckout}
        onConfirm={performCheckOut}
        onCheckedOut={handleCheckedOut}
      />
    </div>
  );
}
