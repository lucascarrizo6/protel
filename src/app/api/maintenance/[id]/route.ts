import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageMaintenance } from "@/lib/maintenance";

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

  if (status !== "ABIERTO" && status !== "RESUELTO") {
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

  const resueltoPorRaw =
    typeof body?.resueltoPor === "string" ? body.resueltoPor.trim() : "";

  const updated = await prisma.maintenanceIssue.update({
    where: { id: params.id },
    data:
      status === "RESUELTO"
        ? {
            status: "RESUELTO",
            resolvedAt: new Date(),
            resueltoPor:
              resueltoPorRaw.length > 0
                ? resueltoPorRaw
                : session.user.name ?? null,
          }
        : { status: "ABIERTO", resolvedAt: null, resueltoPor: null },
    include: { room: { select: { number: true, floor: true } } },
  });

  return NextResponse.json(updated);
}
