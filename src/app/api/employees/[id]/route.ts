import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageEmployees, isValidCuitCuil } from "@/lib/employees";

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function cleanDate(value: unknown): Date | null {
  const str = clean(value);
  if (!str) return null;
  const date = new Date(`${str}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function findOwnedEmployee(id: string, hotelId: string) {
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee || employee.hotelId !== hotelId) return null;
  return employee;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user.hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!canManageEmployees(session.user.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const existing = await findOwnedEmployee(params.id, session.user.hotelId);
  if (!existing) {
    return NextResponse.json(
      { error: "Empleado no encontrado." },
      { status: 404 }
    );
  }

  const body = await request.json().catch(() => null);
  const nombre = clean(body?.nombre);
  const puesto = clean(body?.puesto);
  const cuitCuil = clean(body?.cuitCuil);

  if (!nombre) {
    return NextResponse.json(
      { error: "Falta el nombre del empleado." },
      { status: 400 }
    );
  }
  if (!puesto) {
    return NextResponse.json(
      { error: "Falta el puesto (ej: Recepción, Mucama, Mantenimiento)." },
      { status: 400 }
    );
  }
  if (cuitCuil && !isValidCuitCuil(cuitCuil)) {
    return NextResponse.json(
      { error: "El CUIT/CUIL debe tener 11 números." },
      { status: 400 }
    );
  }

  const employee = await prisma.employee.update({
    where: { id: params.id },
    data: {
      nombre,
      puesto,
      dni: clean(body?.dni),
      cuitCuil,
      fechaNacimiento: cleanDate(body?.fechaNacimiento),
      fechaIngreso: cleanDate(body?.fechaIngreso),
      telefono: clean(body?.telefono),
      email: clean(body?.email),
      contactoEmergenciaNombre: clean(body?.contactoEmergenciaNombre),
      contactoEmergenciaTelefono: clean(body?.contactoEmergenciaTelefono),
      notas: clean(body?.notas),
      activo: body?.activo !== false,
    },
  });

  return NextResponse.json(employee);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user.hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!canManageEmployees(session.user.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const existing = await findOwnedEmployee(params.id, session.user.hotelId);
  if (!existing) {
    return NextResponse.json(
      { error: "Empleado no encontrado." },
      { status: 404 }
    );
  }

  await prisma.employee.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
