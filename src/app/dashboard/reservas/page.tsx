import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { GuestProfileDTO } from "@/lib/guest-profile";
import { RESERVATION_ROOM_GROUPMEMBER_INCLUDE } from "@/lib/reservation-detail";
import { getScopedHome } from "@/lib/staff-scope";
import { ReservationsView } from "./reservations-view";

const GUEST_PROFILE_SELECT = {
  dni: true,
  documentType: true,
  prefRecepcion: true,
  prefMucama: true,
  prefCocina: true,
  vip: true,
  vipMotivo: true,
} as const;

export default async function ReservationsPage() {
  const session = await getServerSession(authOptions);

  const scopedHome = getScopedHome(session?.user.role);
  if (scopedHome) {
    redirect(scopedHome);
  }

  const [reservations, rooms, guestProfiles] = session?.user.hotelId
    ? await Promise.all([
        prisma.reservation.findMany({
          where: { hotelId: session.user.hotelId },
          include: RESERVATION_ROOM_GROUPMEMBER_INCLUDE,
          orderBy: { checkIn: "desc" },
          take: 50,
        }),
        prisma.room.findMany({
          where: { hotelId: session.user.hotelId },
          select: {
            id: true,
            number: true,
            type: true,
            status: true,
            pricePerNight: true,
          },
          orderBy: [{ floor: "asc" }, { number: "asc" }],
        }),
        prisma.guestProfile.findMany({
          where: { hotelId: session.user.hotelId },
          select: GUEST_PROFILE_SELECT,
        }),
      ])
    : [[], [], []];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Reservas</h1>
        <p className="text-sm text-muted-foreground">
          Consulta y gestiona las reservas actuales y próximas de los huéspedes.
        </p>
      </div>

      <ReservationsView
        initialReservations={reservations}
        rooms={rooms}
        guestProfiles={guestProfiles as GuestProfileDTO[]}
      />
    </div>
  );
}
