import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GroupsView } from "./groups-view";

export default async function GruposPage() {
  const session = await getServerSession(authOptions);
  const hotelId = session?.user.hotelId;

  const [rooms, reservations, groups] = hotelId
    ? await Promise.all([
        prisma.room.findMany({
          where: { hotelId },
          orderBy: [{ floor: "asc" }, { number: "asc" }],
        }),
        prisma.reservation.findMany({
          where: { hotelId, status: { in: ["PENDIENTE", "CONFIRMADA"] } },
          select: { roomId: true, checkIn: true, checkOut: true },
        }),
        prisma.group.findMany({
          where: { hotelId },
          include: {
            members: { include: { room: true, reservation: true } },
          },
          orderBy: { creadoEn: "desc" },
        }),
      ])
    : [[], [], []];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Grupos</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona reservas grupales: coordina habitaciones, integrantes y
          cortesías.
        </p>
      </div>

      <GroupsView
        initialGroups={groups}
        rooms={rooms}
        existingReservations={reservations}
      />
    </div>
  );
}
