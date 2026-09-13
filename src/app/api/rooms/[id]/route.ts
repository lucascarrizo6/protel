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

  const trimmedNotes = notes.trim();

  const updatedRoom = await prisma.room.update({
    where: { id: params.id },
    data: {
      status,
      notes: trimmedNotes.length === 0 ? null : trimmedNotes,
    },
  });

// 👇 LÓGICA AUTOMÁTICA CORREGIDA 👇
  if (status === "CLEANING") {
    // Actualizamos directo por roomId, sin usar fechas
    await prisma.housekeepingTask.updateMany({
      where: { 
        roomId: params.id 
      },
      data: { 
        limpiadaHoy: false, 
        status: "PENDIENTE" 
      }
    });
  }
  // 👆 FIN DE LA LÓGICA 👆

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
