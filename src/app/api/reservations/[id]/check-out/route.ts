import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseExtras, sumExtras } from "@/lib/reservation-extras";

export async function PATCH(
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
      include: { room: true, groupMember: true },
    });

    await tx.room.update({
      where: { id: reservation.roomId },
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
