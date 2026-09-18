import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HOUSEKEEPING_STATUSES } from "@/lib/housekeeping-status";
import type { HousekeepingStatus } from "@/generated/prisma/enums";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user.hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (
    body?.status !== undefined &&
    !HOUSEKEEPING_STATUSES.includes(body.status as HousekeepingStatus)
  ) {
    return NextResponse.json(
      { error: "Estado de tarea inválido." },
      { status: 400 }
    );
  }

  // Acá ya traemos la habitación de la BD, así que aprovechamos su estado más abajo
  const room = await prisma.room.findUnique({
    where: { id: params.id },
    include: { housekeepingTask: true },
  });

  if (!room || room.hotelId !== session.user.hotelId) {
    return NextResponse.json(
      { error: "Habitación no encontrada." },
      { status: 404 }
    );
  }

  const status = (body?.status as HousekeepingStatus | undefined) ??
    room.housekeepingTask?.status ??
    "PENDIENTE";
  const limpiadaHoy =
    typeof body?.limpiadaHoy === "boolean"
      ? body.limpiadaHoy
      : (room.housekeepingTask?.limpiadaHoy ?? false);
  const priority =
    typeof body?.priority === "boolean"
      ? body.priority
      : (room.housekeepingTask?.priority ?? false);
  const notes =
    typeof body?.notes === "string"
      ? body.notes.trim() || null
      : (room.housekeepingTask?.notes ?? null);
  const reason =
    typeof body?.reason === "string"
      ? body.reason.trim() || null
      : (room.housekeepingTask?.reason ?? null);

  const task = await prisma.$transaction(async (tx) => {
    const upserted = await tx.housekeepingTask.upsert({
      where: { roomId: params.id },
      update: { status, limpiadaHoy, priority, notes, reason },
      create: {
        status,
        limpiadaHoy,
        priority,
        notes,
        reason,
        roomId: params.id,
        hotelId: session.user.hotelId!,
      },
    });

    // Máquina de estados: la limpieza solo puede "graduar" una habitación
    // que estaba efectivamente en LIMPIEZA. Si ya estaba OCUPADA o en
    // MANTENIMIENTO/BLOQUEADA, tildar la tarea de hoy no debe moverla de
    // ahí (evita, por ejemplo, sacar una habitación de mantenimiento solo
    // porque alguien marcó su tarea de limpieza como hecha).
    if (body?.limpiadaHoy === true && room.status === "CLEANING") {
      const activeReservation = await tx.reservation.findFirst({
        where: {
          roomId: params.id,
          hotelId: session.user.hotelId!,
          status: "CONFIRMADA",
        },
      });

      const newStatus = activeReservation ? "OCCUPIED" : "AVAILABLE";

      await tx.room.update({
        where: { id: params.id },
        data: { status: newStatus },
      });
    }

    return upserted;
  });

  return NextResponse.json(task);
}
