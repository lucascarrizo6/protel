import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user.hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: params.id },
  });

  if (!reservation || reservation.hotelId !== session.user.hotelId) {
    return NextResponse.json({ error: "Reserva no encontrada." }, { status: 404 });
  }

  // 1. Buscamos habitaciones ocupadas en estas fechas exactas
  const overlappingReservations = await prisma.reservation.findMany({
    where: {
      hotelId: session.user.hotelId,
      roomId: { not: null },
      status: { in: ["CONFIRMADA", "COMPLETADA"] },
      checkIn: { lt: reservation.checkOut },
      checkOut: { gt: reservation.checkIn },
      id: { not: reservation.id },
    },
    select: { roomId: true },
  });

  const busyRoomIds = overlappingReservations.map((r) => r.roomId as string);

  // 2. Traemos las habitaciones que NO están en la lista ocupada y están aptas físicamente
  const availableRooms = await prisma.room.findMany({
    where: {
      hotelId: session.user.hotelId,
      status: { in: ["AVAILABLE", "CLEANING"] },
      id: { notIn: busyRoomIds },
    },
    orderBy: { number: "asc" },
  });

  return NextResponse.json(availableRooms);
}