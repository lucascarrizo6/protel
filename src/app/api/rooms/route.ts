import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user.hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (session.user.role !== "HOTEL_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);

  const number = typeof body?.number === "string" ? body.number.trim() : "";
  const type = typeof body?.type === "string" ? body.type.trim() : "";
  const capacity = Number(body?.capacity);
  const pricePerNight = Number(body?.pricePerNight);

  if (
    !number ||
    !type ||
    !Number.isInteger(capacity) ||
    capacity <= 0 ||
    !Number.isFinite(pricePerNight) ||
    pricePerNight < 0
  ) {
    return NextResponse.json(
      { error: "Completa todos los datos correctamente." },
      { status: 400 }
    );
  }

  const existing = await prisma.room.findUnique({
    where: { hotelId_number: { hotelId: session.user.hotelId, number } },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Ya existe una habitación con ese número." },
      { status: 409 }
    );
  }

  const room = await prisma.room.create({
    data: {
      number,
      type,
      floor: 0,
      capacity,
      pricePerNight,
      hotelId: session.user.hotelId,
    },
  });

  return NextResponse.json(room);
}
