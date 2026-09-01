import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { roomIds, assignedToId } = body;

    if (!roomIds || !Array.isArray(roomIds)) {
      return NextResponse.json({ error: "IDs inválidos" }, { status: 400 });
    }

    // Actualiza todas las tareas de las habitaciones seleccionadas
    await prisma.housekeepingTask.updateMany({
      where: {
        roomId: { in: roomIds },
      },
      data: {
        assignedToId: assignedToId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error bulk update:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}