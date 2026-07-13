import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HousekeepingRoomCard } from "./housekeeping-room-card";

export default async function MucamaPage() {
  const session = await getServerSession(authOptions);

  const rooms = session?.user.hotelId
    ? await prisma.room.findMany({
        where: { hotelId: session.user.hotelId },
        include: { housekeepingTask: true },
        orderBy: [{ floor: "asc" }, { number: "asc" }],
      })
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Mucama</h1>
        <p className="text-sm text-muted-foreground">
          Controla las tareas de limpieza y la disponibilidad de las habitaciones.
        </p>
      </div>

      {rooms.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aún no hay habitaciones</CardTitle>
            <CardDescription>
              Las tareas de limpieza aparecerán aquí una vez que haya habitaciones
              cargadas.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rooms.map((room) => (
            <HousekeepingRoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </div>
  );
}
