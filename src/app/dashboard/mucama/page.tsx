
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyCleaning } from "./daily-cleaning";
import { MobileCleaningView } from "./mobile-cleaning-view";
import { AutoRefresh } from "@/components/auto-refresh";

export default async function MucamaPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const isMucama = role === "HOUSEKEEPING";
  const isSuperAdmin = role === "SUPER_ADMIN";

  const [rooms, activeReservations, mucamas] = session?.user.hotelId
    ? await Promise.all([
        prisma.room.findMany({
          where: { hotelId: session.user.hotelId },
          include: { housekeepingTask: true },
          orderBy: [{ floor: "asc" }, { number: "asc" }],
        }),
        prisma.reservation.findMany({
          where: { hotelId: session.user.hotelId, status: "CONFIRMADA" },
        }),
        prisma.user.findMany({
          where: { hotelId: session.user.hotelId, role: "HOUSEKEEPING" },
          select: { id: true, name: true },
        }),
      ])
    : [[], [], []];

  const reservationByRoomId = new Map(
    activeReservations.map((reservation) => [reservation.roomId, reservation])
  );

  const roomsWithDaily = rooms.map((room) => ({
    ...room,
    activeReservation: reservationByRoomId.get(room.id) ?? null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh interval={5000} />
      <div className="flex flex-col gap-1 print:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isMucama ? "Mis Tareas" : "Mucama"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isMucama 
            ? "Gestión rápida de limpieza de habitaciones." 
            : "Controla las tareas de limpieza y la disponibilidad de las habitaciones."}
        </p>
      </div>

      {rooms.length === 0 ? (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>Aún no hay habitaciones</CardTitle>
            <CardDescription>
              Las tareas de limpieza aparecerán aquí una vez que haya habitaciones cargadas.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : isMucama ? (
        <MobileCleaningView initialRooms={roomsWithDaily} currentUserId={session?.user.id} />
      ) : (
        <DailyCleaning 
          initialRooms={roomsWithDaily} 
          mucamas={mucamas} 
          isSuperAdmin={isSuperAdmin} 
        />
      )}
    </div>
  );
}