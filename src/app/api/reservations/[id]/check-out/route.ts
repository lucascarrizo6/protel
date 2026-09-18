import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseExtras, sumExtras } from "@/lib/reservation-extras";
import { RESERVATION_ROOM_GROUPMEMBER_INCLUDE } from "@/lib/reservation-detail";
import { isGeneralAccessRole } from "@/lib/staff-scope";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user.hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!isGeneralAccessRole(session.user.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: params.id },
  });

  if (!reservation || reservation.hotelId !== session.user.hotelId) {
    return NextResponse.json(
      { error: "Reserva no encontrada." },
      { status: 404 }
    );
  }

  if (reservation.status !== "CONFIRMADA") {
    return NextResponse.json(
      { error: "Solo se puede hacer check-out a reservas confirmadas." },
      { status: 409 }
    );
  }

  // Invariante: una reserva CONFIRMADA siempre tiene habitación asignada
  // (se setean juntas en confirmCheckInPayment). Si esto falla, hay datos
  // corruptos y preferimos avisar en vez de intentar limpiar una habitación
  // inexistente.
  if (!reservation.roomId) {
    return NextResponse.json(
      { error: "La reserva no tiene habitación asignada." },
      { status: 409 }
    );
  }

  const roomId = reservation.roomId;
  const extrasTotal = sumExtras(parseExtras(reservation.extras));

  const updatedReservation = await prisma.$transaction(async (tx) => {
    const current = await tx.reservation.findUniqueOrThrow({
      where: { id: params.id },
    });

    if (current.status !== "CONFIRMADA") {
      throw new Error("CONFLICT");
    }

    if (extrasTotal > 0) {
      await tx.invoice.create({
        data: {
          amount: extrasTotal,
          status: "PAGADA",
          type: "CONSUMOS",
          reservationId: reservation.id,
          hotelId: session.user.hotelId!,
        },
      });
    }

    const updated = await tx.reservation.update({
      where: { id: params.id },
      data: { status: "COMPLETADA" },
      include: RESERVATION_ROOM_GROUPMEMBER_INCLUDE,
    });

    await tx.room.update({
      where: { id: roomId },
      data: { status: "CLEANING" },
    });

    return updated;
  }).catch((error) => {
    if (error instanceof Error && error.message === "CONFLICT") return null;
    throw error;
  });

  if (!updatedReservation) {
    return NextResponse.json(
      { error: "Solo se puede hacer check-out a reservas confirmadas." },
      { status: 409 }
    );
  }

  return NextResponse.json(updatedReservation);
}