import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageMaintenance } from "@/lib/maintenance";

const VALID_STATUSES = ["PENDIENTE", "EN_REVISION", "DERIVADO", "RESUELTO"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user.hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!canManageMaintenance(session.user.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const status = body?.status;
  const actionNote = typeof body?.actionNote === "string" ? body.actionNote.trim() : null;
  const receiptUrl = typeof body?.receiptUrl === "string" ? body.receiptUrl.trim() : null;
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }

  const issue = await prisma.maintenanceIssue.findUnique({
    where: { id: params.id },
  });

  if (!issue || issue.hotelId !== session.user.hotelId) {
    return NextResponse.json(
      { error: "Problema no encontrado." },
      { status: 404 }
    );
  }

  // Preparamos el objeto de actualización de Prisma
  const dataToUpdate: any = {};

  if (status) {
    dataToUpdate.status = status;
    if (status === "RESUELTO") {
      dataToUpdate.resolvedAt = new Date();
      dataToUpdate.resueltoPor = session.user.name ?? "Técnico";
    } else {
      // Si vuelve hacia atrás en el flujo, limpiamos los datos de resolución
      dataToUpdate.resolvedAt = null;
      dataToUpdate.resueltoPor = null;
    }
  }

  // Generamos un registro automático en MaintenanceHistory si el técnico escribe una nota 
  // o si presiona un botón para cambiar el estado de la reparación.
  if (actionNote || (status && status !== issue.status)) {
    dataToUpdate.history = {
      create: {
        action: status ? `Estado actualizado a ${status}` : "Actualización de novedades",
        notes: actionNote || null,
        receiptUrl: receiptUrl || null,
        userId: session.user.id,
      },
    };
  }

  const updated = await prisma.maintenanceIssue.update({
    where: { id: params.id },
    data: dataToUpdate,
    include: { room: true },
  });

  return NextResponse.json(updated);
}
