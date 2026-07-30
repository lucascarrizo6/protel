import type { Prisma } from "@/generated/prisma/client";

// Una reserva PENDIENTE que nunca se pagó no debería bloquear la
// disponibilidad para siempre: si pasaron más de 30 minutos desde que se
// creó, se ignora al calcular solapamientos (no se borra ni se cancela,
// simplemente deja de contar como "ocupada").
export const PENDING_RESERVATION_TTL_MS = 30 * 60 * 1000;

/** Fragmento de `where` que matchea reservas que efectivamente bloquean una habitación. */
export function blockingReservationFilter(): Prisma.ReservationWhereInput {
  return {
    OR: [
      { status: "CONFIRMADA" },
      {
        status: "PENDIENTE",
        createdAt: { gte: new Date(Date.now() - PENDING_RESERVATION_TTL_MS) },
      },
    ],
  };
}
