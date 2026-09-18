import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";
import { USER_ROLES, formatRole } from "@/lib/format-role";
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
  const password = typeof body?.password === "string" ? body.password : undefined;

  if (rol === undefined && password === undefined) {
    return NextResponse.json(
      { error: "Nada para actualizar." },
      { status: 400 }
    );
  }

  if (rol !== undefined && !USER_ROLES.includes(rol)) {
    return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
  }

  if (password !== undefined && password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: { hotel: { select: { id: true, name: true } } },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Usuario no encontrado." },
      { status: 404 }
    );
  }

  if (rol !== undefined && user.role === "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "No se puede cambiar el rol de un Super Administrador." },
      { status: 403 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: {
      ...(rol !== undefined ? { role: rol } : {}),
      ...(password !== undefined
        ? { passwordHash: await hashPassword(password) }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  if (rol !== undefined) {
    await logAudit({
      actorId: session.user.id,
      actorName: session.user.name ?? session.user.email ?? "Super Admin",
      accion: "usuario.rol_cambiado",
      hotelId: user.hotel?.id,
      hotelName: user.hotel?.name,
      detalle: `${updated.name} (${updated.email}) → ${formatRole(rol)}`,
    });
  }
  if (password !== undefined) {
    await logAudit({
      actorId: session.user.id,
      actorName: session.user.name ?? session.user.email ?? "Super Admin",
      accion: "usuario.password_reseteada",
      hotelId: user.hotel?.id,
      hotelName: user.hotel?.name,
      detalle: `${updated.name} (${updated.email})`,
    });
  }

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

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: { hotel: { select: { id: true, name: true } } },
  });

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

  await logAudit({
    actorId: session.user.id,
    actorName: session.user.name ?? session.user.email ?? "Super Admin",
    accion: "usuario.eliminado",
    hotelId: user.hotel?.id,
    hotelName: user.hotel?.name,
    detalle: `${user.name} (${user.email})`,
  });

  return NextResponse.json({ ok: true });
}
