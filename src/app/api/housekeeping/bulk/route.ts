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

    if (!roomIds || !Array.isArray(roomIds)) {
      return NextResponse.json({ error: "IDs inválidos" }, { status: 400 });
    }

    // Actualiza solo las tareas de habitaciones que son de ESTE hotel —
    // sin este filtro, cualquier hotel podía reasignar tareas de otro.
    await prisma.housekeepingTask.updateMany({
      where: {
        roomId: { in: roomIds },
        hotelId: session.user.hotelId,
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
