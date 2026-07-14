import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DailyCleaning } from "./daily-cleaning";

export default async function MucamaPage() {
  const session = await getServerSession(authOptions);

  const [rooms, activeReservations] = session?.user.hotelId
    ? await Promise.all([
        prisma.room.findMany({
          where: { hotelId: session.user.hotelId },
          include: { housekeepingTask: true },
          orderBy: [{ floor: "asc" }, { number: "asc" }],
        }),
        prisma.reservation.findMany({
          where: { hotelId: session.user.hotelId, status: "CONFIRMADA" },
        }),
      ])
    : [[], []];

  const reservationByRoomId = new Map(
    activeReservations.map((reservation) => [reservation.roomId, reservation])
  );

  const roomsWithDaily = rooms.map((room) => ({
    ...room,
    activeReservation: reservationByRoomId.get(room.id) ?? null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 print:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">Mucama</h1>
        <p className="text-sm text-muted-foreground">
          Controla las tareas de limpieza y la disponibilidad de las habitaciones.
        </p>
      </div>

      {rooms.length === 0 ? (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>Aún no hay habitaciones</CardTitle>
            <CardDescription>
              Las tareas de limpieza aparecerán aquí una vez que haya habitaciones
              cargadas.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <DailyCleaning initialRooms={roomsWithDaily} />
      )}
    </div>
  );
}
