import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROOM_STATUSES } from "@/lib/room-status";
import type { RoomStatus } from "@/generated/prisma/enums";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user.hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (session.user.role !== "HOTEL_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const status = body?.status as RoomStatus | undefined;
  const notes = typeof body?.notes === "string" ? body.notes : "";

  if (!status || !ROOM_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Estado de habitación inválido." }, { status: 400 });
  }

  const room = await prisma.room.findUnique({ where: { id: params.id } });

  if (!room || room.hotelId !== session.user.hotelId) {
    return NextResponse.json({ error: "Habitación no encontrada." }, { status: 404 });
  }

  // Máquina de estados: a Limpieza solo se puede llegar manualmente desde
  // Disponible u Ocupada. Desde Mantenimiento o Bloqueada hay que pasar
  // primero por esos flujos propios (no por este cambio manual genérico).
  if (status === "CLEANING" && room.status !== "AVAILABLE" && room.status !== "OCCUPIED") {
    return NextResponse.json(
      { error: "Solo se puede pasar a Limpieza desde Disponible u Ocupada." },
      { status: 409 }
    );
  }

  const trimmedNotes = notes.trim();

  const updatedRoom = await prisma.$transaction(async (tx) => {
    const updated = await tx.room.update({
      where: { id: params.id },
      data: {
        status,
        notes: trimmedNotes.length === 0 ? null : trimmedNotes,
      },
    });

    // Re-limpieza manual: si la mandan de vuelta a Limpieza, su tarea de
    // hoy vuelve a "no limpia" — upsert porque puede no existir todavía.
    if (status === "CLEANING") {
      await tx.housekeepingTask.upsert({
        where: { roomId: params.id },
        update: { limpiadaHoy: false, status: "PENDIENTE" },
        create: {
          roomId: params.id,
          hotelId: session.user.hotelId!,
          limpiadaHoy: false,
          status: "PENDIENTE",
        },
      });
    }

    return updated;
  });

  return NextResponse.json(updatedRoom);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user.hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (session.user.role !== "HOTEL_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const room = await prisma.room.findUnique({ where: { id: params.id } });

  if (!room || room.hotelId !== session.user.hotelId) {
    return NextResponse.json({ error: "Habitación no encontrada." }, { status: 404 });
  }

  if (room.status !== "AVAILABLE") {
    return NextResponse.json(
      { error: "Solo se pueden eliminar habitaciones disponibles." },
      { status: 409 }
    );
  }

  await prisma.room.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
