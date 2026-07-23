import { prisma } from "@/lib/prisma";
import { nightsBetween } from "@/lib/nights-between";
import type { PaymentMethod } from "@/generated/prisma/enums";

/**
 * Registra el pago de alojamiento y confirma el check-in: crea la factura
 * PAGADA, pasa la reserva a CONFIRMADA y la habitación a OCCUPIED, todo en
 * una transacción. Usado tanto por el check-in manual como por el webhook
 * de MercadoPago, para que ambos caminos tengan exactamente el mismo efecto.
 *
 * Devuelve `null` si la reserva no existe o ya no está PENDIENTE (evita
 * doble cobro si se llama más de una vez, p.ej. por reintentos del webhook).
 */
export async function confirmCheckInPayment(
  reservationId: string,
  paymentMethod: PaymentMethod
) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { room: true, groupMember: true },
  });

  if (!reservation || reservation.status !== "PENDIENTE") {
    return null;
  }

  const amount = reservation.groupMember?.esFree
    ? 0
    : nightsBetween(reservation.checkIn, reservation.checkOut) *
      reservation.room.pricePerNight;

  return prisma.$transaction(async (tx) => {
    const current = await tx.reservation.findUniqueOrThrow({
      where: { id: reservationId },
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
        hotelId: reservation.hotelId,
      },
    });

    const updated = await tx.reservation.update({
      where: { id: reservationId },
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
}
