import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user.hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const monthParam = request.nextUrl.searchParams.get("month");
  const match = monthParam?.match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return NextResponse.json(
      { error: "Parámetro month inválido. Formato esperado: YYYY-MM." },
      { status: 400 }
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const reservations = await prisma.reservation.findMany({
    where: {
      hotelId: session.user.hotelId,
      status: { not: "CANCELADA" },
      checkIn: { lt: monthEnd },
      checkOut: { gt: monthStart },
    },
    include: { room: true },
    orderBy: { checkIn: "asc" },
  });

  return NextResponse.json(reservations);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user.hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  const guestName =
    typeof body?.guestName === "string" ? body.guestName.trim() : "";
  const dni = typeof body?.dni === "string" ? body.dni.trim() : "";
  const roomId = typeof body?.roomId === "string" ? body.roomId : "";
  const checkInRaw = typeof body?.checkIn === "string" ? body.checkIn : "";
  const checkOutRaw = typeof body?.checkOut === "string" ? body.checkOut : "";

  if (!guestName || !dni || !roomId || !checkInRaw || !checkOutRaw) {
    return NextResponse.json(
      { error: "Faltan datos obligatorios." },
      { status: 400 }
    );
  }

  const checkIn = new Date(checkInRaw);
  const checkOut = new Date(checkOutRaw);

  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
    return NextResponse.json({ error: "Fechas inválidas." }, { status: 400 });
  }

  if (checkOut <= checkIn) {
    return NextResponse.json(
      { error: "La fecha de salida debe ser posterior a la de entrada." },
      { status: 400 }
    );
  }

  const room = await prisma.room.findUnique({ where: { id: roomId } });

  if (!room || room.hotelId !== session.user.hotelId) {
    return NextResponse.json(
      { error: "Habitación no encontrada." },
      { status: 404 }
    );
  }

  const reservation = await prisma.reservation.create({
    data: {
      guestName,
      dni,
      checkIn,
      checkOut,
      roomId,
      hotelId: session.user.hotelId,
    },
    include: { room: true, groupMember: true },
  });

  return NextResponse.json(reservation);
}
