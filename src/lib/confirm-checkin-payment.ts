import { prisma } from "@/lib/prisma";
import { nightsBetween } from "@/lib/nights-between";
import type { PaymentMethod } from "@/generated/prisma/enums";

export async function confirmCheckInPayment(
  reservationId: string,
  paymentMethod: PaymentMethod,
  roomId: string
) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { groupMember: true },
  });

  if (!reservation || reservation.status !== "PENDIENTE") {
    return null;
  }

  const selectedRoom = await prisma.room.findUnique({
    where: { id: roomId }
  });

  if (!selectedRoom) {
    throw new Error("La habitación seleccionada no existe.");
  }

  if (selectedRoom.status === "OCCUPIED" || selectedRoom.status === "BLOCKED") {
    throw new Error(`La habitación ${selectedRoom.number} no está disponible (Estado: ${selectedRoom.status}).`);
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

    // VALIDACIÓN CRÍTICA: Evitar superposición física en la misma habitación
    const overlapping = await tx.reservation.count({
      where: {
        roomId: roomId,
        status: { in: ["CONFIRMADA", "COMPLETADA"] },
        checkIn: { lt: reservation.checkOut },
        checkOut: { gt: reservation.checkIn },
      }
    });

    if (overlapping > 0) {
      throw new Error(`La habitación ${selectedRoom.number} ya tiene otra reserva asignada en estas fechas.`);
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
      data: { 
        status: "CONFIRMADA",
        roomId: roomId 
      },
      include: { room: true, groupMember: true },
    });

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
