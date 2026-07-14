import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseExtras } from "@/lib/reservation-extras";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user.hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const extras = parseExtras(body?.extras);

  if (
    !Array.isArray(body?.extras) ||
    extras.length !== body.extras.length ||
    extras.some((extra) => !extra.nombre.trim() || extra.monto < 0)
  ) {
    return NextResponse.json(
      { error: "Los cargos extras no son válidos." },
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

  const updated = await prisma.reservation.update({
    where: { id: params.id },
    data: { extras },
    include: { room: true },
  });

  return NextResponse.json(updated);
}
