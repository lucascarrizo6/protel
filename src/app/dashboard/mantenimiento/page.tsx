import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageMaintenance } from "@/lib/maintenance";
import { MaintenanceView, type MaintenanceIssueDTO } from "./maintenance-view";

export default async function MantenimientoPage() {
  const session = await getServerSession(authOptions);
  const hotelId = session?.user.hotelId;

  if (!hotelId || !canManageMaintenance(session.user.role)) {
    redirect("/dashboard");
  }

  const [openRaw, resolvedRaw, rooms] = await Promise.all([
    prisma.maintenanceIssue.findMany({
where: { hotelId, status: { in: ["PENDIENTE", "EN_REVISION", "DERIVADO"] } },      include: { room: { select: { number: true, floor: true } } },
      orderBy: [{ severity: "asc" }, { createdAt: "asc" }],
    }),
    prisma.maintenanceIssue.findMany({
      where: { hotelId, status: "RESUELTO" },
      include: { room: { select: { number: true, floor: true } } },
      orderBy: [{ resolvedAt: "desc" }],
      take: 40,
    }),
    prisma.room.findMany({
      where: { hotelId },
      select: { id: true, number: true, floor: true },
      orderBy: [{ floor: "asc" }, { number: "asc" }],
    }),
  ]);

  const serialize = (issue: (typeof openRaw)[number]): MaintenanceIssueDTO => ({
    id: issue.id,
    titulo: issue.titulo,
    detalle: issue.detalle,
    severity: issue.severity,
    status: issue.status,
    reportadoPor: issue.reportadoPor,
    resueltoPor: issue.resueltoPor,
    createdAt: issue.createdAt.toISOString(),
    resolvedAt: issue.resolvedAt ? issue.resolvedAt.toISOString() : null,
    roomNumber: issue.room.number,
    roomFloor: issue.room.floor,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Mantenimiento</h1>
        <p className="text-sm text-muted-foreground">
          Problemas de cada habitación. Cargá lo que encuentres con su gravedad y
          marcá arreglado cuando se resuelva.
        </p>
      </div>

      <MaintenanceView
        openIssues={openRaw.map(serialize)}
        resolvedIssues={resolvedRaw.map(serialize)}
        rooms={rooms}
        currentUserName={session.user.name ?? ""}
      />
    </div>
  );
}
