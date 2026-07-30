import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { USER_ROLES } from "@/lib/format-role";
import type { UserRole } from "@/generated/prisma/enums";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const rol = body?.rol as UserRole | undefined;

  if (!rol || !USER_ROLES.includes(rol)) {
    return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: params.id } });

  if (!user) {
    return NextResponse.json(
      { error: "Usuario no encontrado." },
      { status: 404 }
    );
  }

  if (user.role === "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "No se puede cambiar el rol de un Super Administrador." },
      { status: 403 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { role: rol },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
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

  if (session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: params.id } });

  if (!user) {
    return NextResponse.json(
      { error: "Usuario no encontrado." },
      { status: 404 }
    );
  }

  if (user.role === "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "No se puede eliminar a un Super Administrador." },
      { status: 400 }
    );
  }

  await prisma.user.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
