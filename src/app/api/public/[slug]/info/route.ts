import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const hotel = await prisma.hotel.findUnique({
    where: { slug: params.slug },
    select: { name: true, active: true },
  });

  if (!hotel || !hotel.active) {
    return NextResponse.json({ error: "Hotel no encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    nombre: hotel.name,
    descripcion: null,
  });
}
