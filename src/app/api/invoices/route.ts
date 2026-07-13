import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user.hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  const reservationId =
    typeof body?.reservationId === "string" ? body.reservationId : "";
  const amount = typeof body?.amount === "number" ? body.amount : NaN;

  if (!reservationId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "Faltan datos obligatorios." },
      { status: 400 }
    );
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
  });

  if (!reservation || reservation.hotelId !== session.user.hotelId) {
    return NextResponse.json(
      { error: "Reserva no encontrada." },
      { status: 404 }
    );
  }

  const invoice = await prisma.invoice.create({
    data: {
      amount,
      reservationId,
      hotelId: session.user.hotelId,
    },
    include: { reservation: { include: { room: true } } },
  });

  return NextResponse.json(invoice);
}
