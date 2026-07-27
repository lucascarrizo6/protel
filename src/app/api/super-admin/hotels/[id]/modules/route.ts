import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HOTEL_MODULE_KEYS, type HotelModuleKey } from "@/lib/super-admin";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const hotel = await prisma.hotel.findUnique({ where: { id: params.id } });

  if (!hotel) {
    return NextResponse.json(
      { error: "Hotel no encontrado." },
      { status: 404 }
    );
  }

  const modules = await prisma.hotelModules.upsert({
    where: { hotelId: params.id },
    update: {},
    create: { hotelId: params.id },
  });

  return NextResponse.json(modules);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const modulo = body?.modulo as HotelModuleKey | undefined;
  const valor = body?.valor;

  if (
    !modulo ||
    !HOTEL_MODULE_KEYS.includes(modulo) ||
    typeof valor !== "boolean"
  ) {
    return NextResponse.json(
      { error: "Módulo o valor inválido." },
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

  const modules = await prisma.hotelModules.upsert({
    where: { hotelId: params.id },
    update: { [modulo]: valor },
    create: { hotelId: params.id, [modulo]: valor },
  });

  return NextResponse.json(modules);
}
