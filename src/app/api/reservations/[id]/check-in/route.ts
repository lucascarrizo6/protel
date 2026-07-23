import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { confirmCheckInPayment } from "@/lib/confirm-checkin-payment";
import { PAYMENT_METHODS } from "@/lib/payment-method";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user.hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const paymentMethod = body?.paymentMethod as
    | (typeof PAYMENT_METHODS)[number]
    | undefined;

  if (!paymentMethod || !PAYMENT_METHODS.includes(paymentMethod)) {
    return NextResponse.json(
      { error: "Selecciona un método de pago válido." },
      { status: 400 }
    );
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

  const updatedReservation = await confirmCheckInPayment(
    params.id,
    paymentMethod
  );

  if (!updatedReservation) {
    return NextResponse.json(
      { error: "Solo se puede hacer check-in a reservas pendientes." },
      { status: 409 }
    );
  }

  return NextResponse.json(updatedReservation);
}
