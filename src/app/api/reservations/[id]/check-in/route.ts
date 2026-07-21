import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nightsBetween } from "@/lib/nights-between";
import { PAYMENT_METHODS } from "@/lib/payment-method";
import type { PaymentMethod } from "@/generated/prisma/enums";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user.hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const paymentMethod = body?.paymentMethod as PaymentMethod | undefined;

  if (!paymentMethod || !PAYMENT_METHODS.includes(paymentMethod)) {
    return NextResponse.json(
      { error: "Selecciona un método de pago válido." },
      { status: 400 }
    );
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: params.id },
    include: { room: true, groupMember: true },
  });

  if (!reservation || reservation.hotelId !== session.user.hotelId) {
    return NextResponse.json(
      { error: "Reserva no encontrada." },
      { status: 404 }
    );
  }

  if (reservation.status !== "PENDIENTE") {
    return NextResponse.json(
      { error: "Solo se puede hacer check-in a reservas pendientes." },
      { status: 409 }
    );
  }

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  if (reservation.checkIn > endOfToday) {
    return NextResponse.json(
      {
        error:
          "Solo se puede hacer check-in si la fecha de entrada es hoy o anterior.",
      },
      { status: 409 }
    );
  }

  const amount = reservation.groupMember?.esFree
    ? 0
    : nightsBetween(reservation.checkIn, reservation.checkOut) *
      reservation.room.pricePerNight;

  const updatedReservation = await prisma.$transaction(async (tx) => {
    const current = await tx.reservation.findUniqueOrThrow({
      where: { id: params.id },
    });

    if (current.status !== "PENDIENTE") {
      throw new Error("CONFLICT");
    }

    await tx.invoice.create({
      data: {
        amount,
        status: "PAGADA",
        type: "ALOJAMIENTO",
        paymentMethod,
        reservationId: reservation.id,
        hotelId: session.user.hotelId!,
      },
    });

    const updated = await tx.reservation.update({
      where: { id: params.id },
      data: { status: "CONFIRMADA" },
      include: { room: true, groupMember: true },
    });

    await tx.room.update({
      where: { id: reservation.roomId },
      data: { status: "OCCUPIED" },
    });

    return updated;
  }).catch((error) => {
    if (error instanceof Error && error.message === "CONFLICT") return null;
    throw error;
  });

  if (!updatedReservation) {
    return NextResponse.json(
      { error: "Solo se puede hacer check-in a reservas pendientes." },
      { status: 409 }
    );
  }

  return NextResponse.json(updatedReservation);
}
