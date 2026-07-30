import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { blockingReservationFilter } from "@/lib/reservation-overlap";

function parseDateParam(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const hotel = await prisma.hotel.findUnique({
    where: { slug: params.slug },
    select: { id: true, active: true },
  });

  if (!hotel || !hotel.active) {
    return NextResponse.json({ error: "Hotel no encontrado." }, { status: 404 });
  }

  const checkIn = parseDateParam(request.nextUrl.searchParams.get("checkIn"));
  const checkOut = parseDateParam(request.nextUrl.searchParams.get("checkOut"));

  if (!checkIn || !checkOut || checkOut <= checkIn) {
    return NextResponse.json(
      { error: "Fechas inválidas. Formato esperado: YYYY-MM-DD." },
      { status: 400 }
    );
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (checkIn < today) {
    return NextResponse.json(
      { error: "La fecha de check-in no puede ser en el pasado." },
      { status: 400 }
    );
  }

  const overlapping = await prisma.reservation.findMany({
    where: {
      hotelId: hotel.id,
      ...blockingReservationFilter(),
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
    select: { roomId: true },
  });

  const excludedRoomIds = overlapping.map((reservation) => reservation.roomId);

  const rooms = await prisma.room.findMany({
    where: {
      hotelId: hotel.id,
      status: { notIn: ["BLOCKED", "MANTENIMIENTO"] },
      ...(excludedRoomIds.length > 0
        ? { id: { notIn: excludedRoomIds } }
        : {}),
    },
    orderBy: [{ floor: "asc" }, { number: "asc" }],
    select: {
      id: true,
      number: true,
      type: true,
      pricePerNight: true,
      capacity: true,
    },
  });

  return NextResponse.json(
    rooms.map((room) => ({
      id: room.id,
      numero: room.number,
      tipo: room.type,
      precio: room.pricePerNight,
      capacidad: room.capacity,
    }))
  );
}
