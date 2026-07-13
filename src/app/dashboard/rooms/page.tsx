import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RoomCard } from "./room-card";

export default async function RoomsPage() {
  const session = await getServerSession(authOptions);

  const rooms = session?.user.hotelId
    ? await prisma.room.findMany({
        where: { hotelId: session.user.hotelId },
        orderBy: [{ floor: "asc" }, { number: "asc" }],
      })
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Habitaciones</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona el inventario, los tipos y el estado de las habitaciones.
        </p>
      </div>

      {rooms.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aún no hay habitaciones</CardTitle>
            <CardDescription>
              Las habitaciones de tu hotel aparecerán aquí una vez que se agreguen.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </div>
  );
}
