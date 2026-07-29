import { NextResponse, type NextRequest } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { nightsBetween } from "@/lib/nights-between";
import { DOCUMENT_TYPES } from "@/lib/document-type";
import type { DocumentType } from "@/generated/prisma/enums";

const mercadoPagoClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const hotel = await prisma.hotel.findUnique({
    where: { slug: params.slug },
  });

  if (!hotel || !hotel.active) {
    return NextResponse.json({ error: "Hotel no encontrado." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);

  const checkInRaw = typeof body?.checkIn === "string" ? body.checkIn : "";
  const checkOutRaw = typeof body?.checkOut === "string" ? body.checkOut : "";
  const roomId = typeof body?.roomId === "string" ? body.roomId : "";
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";
  const apellido = typeof body?.apellido === "string" ? body.apellido.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const telefono = typeof body?.telefono === "string" ? body.telefono.trim() : "";
  const tipoDocumento = body?.tipoDocumento as DocumentType | undefined;
  const numeroDocumento =
    typeof body?.numeroDocumento === "string" ? body.numeroDocumento.trim() : "";

  if (
    !checkInRaw ||
    !checkOutRaw ||
    !roomId ||
    !nombre ||
    !apellido ||
    !email ||
    !email.includes("@") ||
    !telefono ||
    !tipoDocumento ||
    !DOCUMENT_TYPES.includes(tipoDocumento) ||
    !numeroDocumento
  ) {
    return NextResponse.json(
      { error: "Completa todos los datos requeridos." },
      { status: 400 }
    );
  }

  const checkIn = parseDate(checkInRaw);
  const checkOut = parseDate(checkOutRaw);

  if (!checkIn || !checkOut || checkOut <= checkIn) {
    return NextResponse.json({ error: "Fechas inválidas." }, { status: 400 });
  }

  const room = await prisma.room.findUnique({ where: { id: roomId } });

  if (
    !room ||
    room.hotelId !== hotel.id ||
    room.status === "BLOCKED" ||
    room.status === "MANTENIMIENTO"
  ) {
    return NextResponse.json(
      { error: "Habitación no disponible." },
      { status: 404 }
    );
  }

  const overlapping = await prisma.reservation.findFirst({
    where: {
      hotelId: hotel.id,
      roomId,
      status: { in: ["PENDIENTE", "CONFIRMADA"] },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
  });

  if (overlapping) {
    return NextResponse.json(
      { error: "La habitación ya no está disponible para esas fechas." },
      { status: 409 }
    );
  }

  const amount = nightsBetween(checkIn, checkOut) * room.pricePerNight;
  const baseUrl = request.nextUrl.origin;

  // Se genera el id de antemano (sin crear la fila todavía) para poder
  // usarlo como external_reference de MercadoPago. La reserva sólo se
  // persiste si la preferencia de pago se creó con éxito: si MercadoPago
  // falla, no queda ninguna reserva PENDIENTE "huérfana" bloqueando la
  // habitación para esas fechas.
  const reservationId = crypto.randomUUID();
  let initPoint: string | undefined;

  try {
    const preference = new Preference(mercadoPagoClient);
    const result = await preference.create({
      body: {
        items: [
          {
            id: reservationId,
            title: `Alojamiento · Habitación ${room.number} · ${hotel.name}`,
            quantity: 1,
            currency_id: "ARS",
            unit_price: amount,
          },
        ],
        payer: { name: nombre, surname: apellido, email },
        external_reference: reservationId,
        back_urls: {
          success: `${baseUrl}/reservar/${params.slug}/exito`,
          failure: `${baseUrl}/reservar/${params.slug}?pago=fallido`,
          pending: `${baseUrl}/reservar/${params.slug}?pago=pendiente`,
        },
      },
    });

    initPoint = result.init_point;
  } catch (error) {
    console.error("Reserva pública · MercadoPago create-preference error:", error);
    return NextResponse.json(
      { error: "No se pudo iniciar el pago. Intenta nuevamente." },
      { status: 502 }
    );
  }

  if (!initPoint) {
    return NextResponse.json(
      { error: "No se pudo iniciar el pago. Intenta nuevamente." },
      { status: 502 }
    );
  }

  // Se re-verifica la disponibilidad recién ahora: el round-trip a
  // MercadoPago pudo haber tardado lo suficiente como para que otra
  // persona reserve la misma habitación mientras tanto.
  const stillOverlapping = await prisma.reservation.findFirst({
    where: {
      hotelId: hotel.id,
      roomId,
      status: { in: ["PENDIENTE", "CONFIRMADA"] },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
  });

  if (stillOverlapping) {
    return NextResponse.json(
      { error: "La habitación ya no está disponible para esas fechas." },
      { status: 409 }
    );
  }

  const reservation = await prisma.reservation.create({
    data: {
      id: reservationId,
      guestName: `${nombre} ${apellido}`.trim(),
      dni: numeroDocumento,
      documentType: tipoDocumento,
      email,
      phone: telefono,
      checkIn,
      checkOut,
      roomId,
      hotelId: hotel.id,
    },
  });

  return NextResponse.json({
    reservaId: reservation.id,
    initPoint,
  });
}
