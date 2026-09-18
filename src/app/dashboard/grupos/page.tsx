import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GroupsView } from "./groups-view";
import type { ComponentProps } from "react";

export default async function GruposPage() {
  const session = await getServerSession(authOptions);
  const hotelId = session?.user.hotelId;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

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
        // Grupos vigentes: los que todavía no salieron o salieron hace menos
        // de 30 días. Los de hace años no aportan a la vista principal.
        prisma.group.findMany({
          where: { hotelId, fechaSalida: { gte: thirtyDaysAgo } },
          include: {
            members: { include: { reservation: { select: { status: true } } } },
          },
          orderBy: { creadoEn: "desc" },
        }),
      ])
    : [[], [], []];

  const validReservations = reservations.filter(
    (res) => res.roomId !== null
  ) as unknown as ComponentProps<typeof GroupsView>["existingReservations"];

  const validGroups = groups as unknown as ComponentProps<typeof GroupsView>["initialGroups"];

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
        initialGroups={validGroups}
        rooms={rooms}
        existingReservations={validReservations}
      />
    </div>
  );
}