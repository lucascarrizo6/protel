import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import type { UserRole } from "@/generated/prisma/enums";

// Roles que un Administrador de Hotel puede darle a su propio equipo. Nunca
// Super Admin: eso solo lo otorga Hotar desde su propio panel.
const HOTEL_USER_ROLES: UserRole[] = [
  "HOTEL_ADMIN",
  "RECEPTIONIST",
  "HOUSEKEEPING",
  "MAINTENANCE",
];

export async function GET() {
  const session = await getServerSession(authOptions);
  const hotelId = session?.user.hotelId;

  if (session?.user.role !== "HOTEL_ADMIN" || !hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const usuarios = await prisma.user.findMany({
    where: { hotelId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json(
    usuarios.map((usuario) => ({
      id: usuario.id,
      nombre: usuario.name,
      email: usuario.email,
      rol: usuario.role,
      creadoEn: usuario.createdAt,
    }))
  );
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const hotelId = session?.user.hotelId;

  if (session?.user.role !== "HOTEL_ADMIN" || !hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const rol = body?.rol as UserRole | undefined;

  if (!nombre || !email || !password || !rol) {
    return NextResponse.json(
      { error: "Faltan datos obligatorios." },
      { status: 400 }
    );
  }

  if (!HOTEL_USER_ROLES.includes(rol)) {
    return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return NextResponse.json(
      { error: "Ya existe un usuario con ese email." },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);

  const usuario = await prisma.user.create({
    data: { name: nombre, email, passwordHash, role: rol, hotelId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json({
    id: usuario.id,
    nombre: usuario.name,
    email: usuario.email,
    rol: usuario.role,
    creadoEn: usuario.createdAt,
  });
}
