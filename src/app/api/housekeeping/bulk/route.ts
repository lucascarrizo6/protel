import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isGeneralAccessRole } from "@/lib/staff-scope";

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user.hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!isGeneralAccessRole(session.user.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { roomIds, assignedToId } = body;
    const hotelId = session.user.hotelId;

    if (!roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
      return NextResponse.json({ error: "IDs inválidos" }, { status: 400 });
    }

    // assignedToId puede venir null/undefined (desasignar); si viene, tiene
    // que ser una mucama real de ESTE hotel — nunca confiamos en el id que
    // manda el cliente sin validarlo contra la base.
    let validAssignedToId: string | null = null;
    if (assignedToId != null) {
      if (typeof assignedToId !== "string") {
        return NextResponse.json({ error: "assignedToId inválido." }, { status: 400 });
      }
      const mucama = await prisma.user.findUnique({ where: { id: assignedToId } });
      if (!mucama || mucama.hotelId !== hotelId || mucama.role !== "HOUSEKEEPING") {
        return NextResponse.json(
          { error: "La mucama seleccionada no es válida." },
          { status: 400 }
        );
      }
      validAssignedToId = mucama.id;
    }

    // Solo habitaciones de ESTE hotel que no estén en Mantenimiento o
    // Bloqueadas — no tiene sentido asignar limpieza ahí.
    const rooms = await prisma.room.findMany({
      where: {
        id: { in: roomIds },
        hotelId,
        status: { notIn: ["MANTENIMIENTO", "BLOCKED"] },
      },
      select: { id: true },
    });

    if (rooms.length === 0) {
      return NextResponse.json(
        { error: "No hay habitaciones válidas para asignar." },
        { status: 400 }
      );
    }

    // upsert (no updateMany): si la habitación todavía no tiene
    // HousekeepingTask para hoy, updateMany no crea nada y la asignación
    // se pierde en silencio — la mucama nunca ve la tarea.
    await prisma.$transaction(
      rooms.map((room) =>
        prisma.housekeepingTask.upsert({
          where: { roomId: room.id },
          update: { assignedToId: validAssignedToId },
          create: {
            roomId: room.id,
            hotelId,
            assignedToId: validAssignedToId,
          },
        })
      )
    );

    return NextResponse.json({ success: true, updated: rooms.length });
  } catch (error) {
    console.error("Error bulk update:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
