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

  if (!session?.user?.hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!canManageMaintenance(session.user.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const estado = request.nextUrl.searchParams.get("estado");
  // Adaptado a la nueva máquina de estados
  const statusFilter = estado === "resuelto" 
    ? { equals: "RESUELTO" } 
    : { in: ["PENDIENTE", "EN_REVISION", "DERIVADO"] };

  const issues = await prisma.maintenanceIssue.findMany({
    where: { 
      hotelId: session.user.hotelId, 
      status: statusFilter 
    },
    include: { room: { select: { number: true, floor: true } } },
    orderBy: estado === "resuelto"
      ? [{ resolvedAt: "desc" }]
      : [{ severity: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(issues);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.hotelId || !session?.user?.id) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  // Permitimos a las mucamas crear tickets, pero mantenemos las restricciones para el resto
  const isHousekeeping = session.user.role === "HOUSEKEEPING";
  if (!isHousekeeping && !canManageMaintenance(session.user.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const roomId = typeof body?.roomId === "string" ? body.roomId : "";
  const titulo = typeof body?.titulo === "string" ? body.titulo.trim() : "";
  const detalleRaw = typeof body?.detalle === "string" ? body.detalle.trim() : "";
  const severity = body?.severity as MaintenanceSeverity | undefined;

  if (!titulo) {
    return NextResponse.json({ error: "Escribí qué problema tiene la habitación." }, { status: 400 });
  }
  if (!severity || !MAINTENANCE_SEVERITIES.includes(severity)) {
    return NextResponse.json({ error: "Elegí la gravedad: ROJO, NARANJA o AMARILLO." }, { status: 400 });
  }

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room || room.hotelId !== session.user.hotelId) {
    return NextResponse.json({ error: "Habitación no encontrada." }, { status: 404 });
  }

  // Objeto base del ticket con la creación del historial inyectada
  const issueData = {
    titulo,
    detalle: detalleRaw.length === 0 ? null : detalleRaw,
    severity,
    status: "PENDIENTE",
    reportadoPor: session.user.id,
    hotelId: session.user.hotelId,
    roomId: room.id,
    history: {
      create: {
        action: "TICKET_CREADO",
        notes: isHousekeeping ? "Reportado desde la aplicación móvil de limpieza" : "Reportado manualmente",
        userId: session.user.id,
      },
    },
  };

  // Lógica original conservada: Bloqueo automático de habitación
  if (severityBlocksRoom(severity)) {
    const [issue] = await prisma.$transaction([
      prisma.maintenanceIssue.create({
        data: issueData as any,
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
    data: issueData as any,
    include: { room: { select: { number: true, floor: true } } },
  });
  
  return NextResponse.json(issue, { status: 201 });
}