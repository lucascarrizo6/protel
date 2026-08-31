import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  MAINTENANCE_SEVERITIES,
  canManageMaintenance,
  severityBlocksRoom,
} from "@/lib/maintenance";
import type { MaintenanceSeverity } from "@/generated/prisma/enums";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user.hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!canManageMaintenance(session.user.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const estado = request.nextUrl.searchParams.get("estado");
  const status = estado === "resuelto" ? "RESUELTO" : "ABIERTO";

  const issues = await prisma.maintenanceIssue.findMany({
    where: { hotelId: session.user.hotelId, status },
    include: { room: { select: { number: true, floor: true } } },
    orderBy:
      status === "ABIERTO"
        ? [{ severity: "asc" }, { createdAt: "asc" }]
        : [{ resolvedAt: "desc" }],
  });

  return NextResponse.json(issues);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user.hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!canManageMaintenance(session.user.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const roomId = typeof body?.roomId === "string" ? body.roomId : "";
  const titulo = typeof body?.titulo === "string" ? body.titulo.trim() : "";
  const detalleRaw =
    typeof body?.detalle === "string" ? body.detalle.trim() : "";
  const severity = body?.severity as MaintenanceSeverity | undefined;
  const reportadoPorRaw =
    typeof body?.reportadoPor === "string" ? body.reportadoPor.trim() : "";

  if (!titulo) {
    return NextResponse.json(
      { error: "Escribí qué problema tiene la habitación." },
      { status: 400 }
    );
  }
  if (!severity || !MAINTENANCE_SEVERITIES.includes(severity)) {
    return NextResponse.json(
      { error: "Elegí la gravedad: rojo, naranja o amarillo." },
      { status: 400 }
    );
  }

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room || room.hotelId !== session.user.hotelId) {
    return NextResponse.json(
      { error: "Habitación no encontrada." },
      { status: 404 }
    );
  }

  const data = {
    titulo,
    detalle: detalleRaw.length === 0 ? null : detalleRaw,
    severity,
    reportadoPor:
      reportadoPorRaw.length > 0 ? reportadoPorRaw : session.user.name ?? null,
    hotelId: session.user.hotelId,
    roomId: room.id,
  };

  // Rojo y naranja sacan la habitación de servicio.
  if (severityBlocksRoom(severity)) {
    const [issue] = await prisma.$transaction([
      prisma.maintenanceIssue.create({
        data,
        include: { room: { select: { number: true, floor: true } } },
      }),
      prisma.room.update({
        where: { id: room.id },
        data: { status: "MANTENIMIENTO" },
      }),
    ]);
    return NextResponse.json(issue, { status: 201 });
  }

  const issue = await prisma.maintenanceIssue.create({
    data,
    include: { room: { select: { number: true, floor: true } } },
  });
  return NextResponse.json(issue, { status: 201 });
}
