import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const slug = slugify(typeof body?.slug === "string" ? body.slug : name);

  if (!name || !slug) {
    return NextResponse.json(
      { error: "Faltan datos obligatorios." },
      { status: 400 }
    );
  }

  const existing = await prisma.hotel.findUnique({ where: { slug } });

  if (existing) {
    return NextResponse.json(
      { error: "Ya existe un hotel con ese slug." },
      { status: 409 }
    );
  }

  const hotel = await prisma.hotel.create({
    data: { name, slug },
    include: { _count: { select: { rooms: true, users: true } } },
  });

  return NextResponse.json(hotel);
}
