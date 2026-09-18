import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";
import { formatRole } from "@/lib/format-role";
import type { UserRole } from "@/generated/prisma/enums";

const HOTEL_USER_ROLES: UserRole[] = [
  "HOTEL_ADMIN",
  "RECEPTIONIST",
  "HOUSEKEEPING",
  "MAINTENANCE",
];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const usuarios = await prisma.user.findMany({
    where: { hotelId: params.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const hotel = await prisma.hotel.findUnique({ where: { id: params.id } });

  if (!hotel) {
    return NextResponse.json({ error: "Hotel no encontrado." }, { status: 404 });
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
    data: {
      name: nombre,
      email,
      passwordHash,
      role: rol,
      hotelId: hotel.id,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  await logAudit({
    actorId: session.user.id,
    actorName: session.user.name ?? session.user.email ?? "Super Admin",
    accion: "usuario.creado",
    hotelId: hotel.id,
    hotelName: hotel.name,
    detalle: `${usuario.name} (${usuario.email}) — ${formatRole(usuario.role)}`,
  });

  return NextResponse.json({
    id: usuario.id,
    nombre: usuario.name,
    email: usuario.email,
    rol: usuario.role,
    creadoEn: usuario.createdAt,
  });
}
