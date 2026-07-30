import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nightsBetween } from "@/lib/nights-between";

const mercadoPagoClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user.hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  const reservaId =
    typeof body?.reservaId === "string" ? body.reservaId : "";

  if (!reservaId) {
    return NextResponse.json(
      { error: "Faltan datos obligatorios." },
      { status: 400 }
    );
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservaId },
    include: { room: true, groupMember: true, hotel: true },
  });

  if (!reservation || reservation.hotelId !== session.user.hotelId) {
    return NextResponse.json(
      { error: "Reserva no encontrada." },
      { status: 404 }
    );
  }

  // El monto se calcula siempre server-side (noches × precio de la
  // habitación), nunca se confía en un valor mandado por el cliente.
  const monto = reservation.groupMember?.esFree
    ? 0
    : nightsBetween(reservation.checkIn, reservation.checkOut) *
      reservation.room.pricePerNight;

  if (monto <= 0) {
    return NextResponse.json(
      { error: "Esta reserva no tiene un monto pendiente de pago." },
      { status: 400 }
    );
  }

  const concepto = `Alojamiento · Habitación ${reservation.room.number} · ${reservation.guestName}`;
  const baseUrl = request.nextUrl.origin;

  try {
    const preference = new Preference(mercadoPagoClient);
    const result = await preference.create({
      body: {
        items: [
          {
            id: reservaId,
            title: concepto,
            quantity: 1,
            currency_id: "ARS",
            unit_price: monto,
          },
        ],
        external_reference: reservaId,
        back_urls: {
          success: `${baseUrl}/dashboard/reservas?pago=exitoso`,
          failure: `${baseUrl}/dashboard/reservas?pago=fallido`,
          pending: `${baseUrl}/dashboard/reservas?pago=pendiente`,
        },
      },
    });

    return NextResponse.json({
      init_point: result.init_point,
      preference_id: result.id,
    });
  } catch (error) {
    console.error("MercadoPago create-preference error:", error);
    return NextResponse.json(
      { error: "No se pudo crear la preferencia de pago." },
      { status: 502 }
    );
  }
}
