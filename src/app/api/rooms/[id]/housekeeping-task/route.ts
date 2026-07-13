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
  const status = body?.status as HousekeepingStatus | undefined;
  const priority = body?.priority === true;

  if (!status || !HOUSEKEEPING_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "Estado de tarea inválido." },
      { status: 400 }
    );
  }

  const room = await prisma.room.findUnique({ where: { id: params.id } });

  if (!room || room.hotelId !== session.user.hotelId) {
    return NextResponse.json(
      { error: "Habitación no encontrada." },
      { status: 404 }
    );
  }

  const task = await prisma.housekeepingTask.upsert({
    where: { roomId: params.id },
    update: { status, priority },
    create: {
      status,
      priority,
      roomId: params.id,
      hotelId: session.user.hotelId,
    },
  });

  return NextResponse.json(task);
}
