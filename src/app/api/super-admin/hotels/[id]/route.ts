import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeHotel } from "@/lib/super-admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (typeof body?.activo !== "boolean") {
    return NextResponse.json(
      { error: "Falta el estado a actualizar." },
      { status: 400 }
    );
  }

  const hotel = await prisma.hotel.findUnique({ where: { id: params.id } });

  if (!hotel) {
    return NextResponse.json(
      { error: "Hotel no encontrado." },
      { status: 404 }
    );
  }

  const updated = await prisma.hotel.update({
    where: { id: params.id },
    data: { active: body.activo },
    include: {
      _count: { select: { users: true } },
      modules: true,
    },
  });

  return NextResponse.json(serializeHotel(updated));
}
