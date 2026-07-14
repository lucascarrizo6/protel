import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const hotels = await prisma.hotel.findMany({
    select: { id: true, rooms: { select: { id: true } } },
  });

  let resetCount = 0;

  for (const hotel of hotels) {
    await Promise.all(
      hotel.rooms.map((room) =>
        prisma.housekeepingTask.upsert({
          where: { roomId: room.id },
          update: {
            status: "PENDIENTE",
            limpiadaHoy: false,
            notes: null,
            reason: null,
          },
          create: {
            status: "PENDIENTE",
            limpiadaHoy: false,
            roomId: room.id,
            hotelId: hotel.id,
          },
        })
      )
    );
    resetCount += hotel.rooms.length;
  }

  return NextResponse.json({ ok: true, hotels: hotels.length, resetCount });
}
