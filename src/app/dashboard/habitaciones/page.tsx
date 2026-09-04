import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RoomsView } from "./rooms-view";
import { AutoRefresh } from "@/components/auto-refresh";

export default async function RoomsPage() {
  const session = await getServerSession(authOptions);

  const rooms = session?.user.hotelId
    ? await prisma.room.findMany({
        where: { hotelId: session.user.hotelId },
        orderBy: [{ floor: "asc" }, { number: "asc" }],
      })
    : [];
  console.log("🖥️ SERVIDOR: Datos de BD", rooms.map(r => `${r.number}:${r.status}`));    
  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh interval={5000} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Habitaciones</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona el inventario, los tipos y el estado de las habitaciones.
        </p>
      </div>

      <RoomsView initialRooms={rooms} />
    </div>
  );
}
