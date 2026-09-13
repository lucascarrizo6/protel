import { prisma } from "@/lib/prisma";
import { nightsBetween } from "@/lib/nights-between";
import type { PaymentMethod } from "@/generated/prisma/enums";

/**
 * Registra el pago de alojamiento y confirma el check-in: asocia la habitación física,
 * crea la factura PAGADA, pasa la reserva a CONFIRMADA y la habitación a OCCUPIED,
 * todo en una transacción segura.
 */
export async function confirmCheckInPayment(
  reservationId: string,
  paymentMethod: PaymentMethod,
  roomId: string // <-- Recibe el ID de la habitación elegida en Recepción
) {
  // 1. Buscamos la reserva flotante
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { groupMember: true },
  });

  if (!reservation || reservation.status !== "PENDIENTE") {
    return null;
  }

  // 2. Buscamos la habitación física elegida para extraer su precio real
  const selectedRoom = await prisma.room.findUnique({
    where: { id: roomId }
  });

  if (!selectedRoom) {
    throw new Error("La habitación seleccionada no existe.");
  }

  const amount = reservation.groupMember?.esFree
    ? 0
    : nightsBetween(reservation.checkIn, reservation.checkOut) * selectedRoom.pricePerNight;

  return prisma.$transaction(async (tx) => {
    const current = await tx.reservation.findUniqueOrThrow({
      where: { id: reservationId },
    });

    if (current.status !== "PENDIENTE") {
      throw new Error("CONFLICT");
    }

    // 3. Creamos la factura de alojamiento
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

    // 4. Confirmamos la reserva y le INYECTAMOS la habitación asignada
    const updated = await tx.reservation.update({
      where: { id: reservationId },
      data: { 
        status: "CONFIRMADA",
        roomId: roomId // <-- Enlazamos la reserva con la llave física
      },
      include: { room: true, groupMember: true },
    });

    // 5. Bloqueamos físicamente la habitación
    await tx.room.update({
      where: { id: roomId },
      data: { status: "OCCUPIED" },
    });

    return updated;
  }).catch((error) => {
    if (error instanceof Error && error.message === "CONFLICT") return null;
    throw error;
  });
}
