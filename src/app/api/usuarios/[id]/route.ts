import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma/enums";

const HOTEL_USER_ROLES: UserRole[] = [
  "HOTEL_ADMIN",
  "RECEPTIONIST",
  "HOUSEKEEPING",
  "MAINTENANCE",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const hotelId = session?.user.hotelId;

  if (session?.user.role !== "HOTEL_ADMIN" || !hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const rol = body?.rol as UserRole | undefined;

  if (!rol || !HOTEL_USER_ROLES.includes(rol)) {
    return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: params.id } });

  // REGLA #1: nunca tocar un usuario de otro hotel, aunque adivinen el id.
  if (!user || user.hotelId !== hotelId) {
    return NextResponse.json(
      { error: "Usuario no encontrado." },
      { status: 404 }
    );
  }

  if (user.id === session.user.id) {
    return NextResponse.json(
      { error: "No podés cambiar tu propio rol. Pedile a otro administrador." },
      { status: 403 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { role: rol },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json({
    id: updated.id,
    nombre: updated.name,
    email: updated.email,
    rol: updated.role,
    creadoEn: updated.createdAt,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const hotelId = session?.user.hotelId;

  if (session?.user.role !== "HOTEL_ADMIN" || !hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: params.id } });

  if (!user || user.hotelId !== hotelId) {
    return NextResponse.json(
      { error: "Usuario no encontrado." },
      { status: 404 }
    );
  }

  if (user.id === session.user.id) {
    return NextResponse.json(
      { error: "No podés eliminar tu propia cuenta." },
      { status: 403 }
    );
  }

  await prisma.user.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
