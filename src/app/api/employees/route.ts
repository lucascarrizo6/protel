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

/** Interpreta "YYYY-MM-DD" (lo que manda un <input type="date">) como medianoche UTC. */
function cleanDate(value: unknown): Date | null {
  const str = clean(value);
  if (!str) return null;
  const date = new Date(`${str}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user.hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!canManageEmployees(session.user.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const employees = await prisma.employee.findMany({
    where: { hotelId: session.user.hotelId },
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
  });

  return NextResponse.json(employees);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user.hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!canManageEmployees(session.user.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
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

  const employee = await prisma.employee.create({
    data: {
      hotelId: session.user.hotelId,
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
    },
  });

  return NextResponse.json(employee, { status: 201 });
}
