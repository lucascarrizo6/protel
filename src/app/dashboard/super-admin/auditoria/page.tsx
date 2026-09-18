import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAuditAction } from "@/lib/audit";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MAX_ROWS = 200;

const DATETIME_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export default async function AuditoriaPage() {
  const session = await getServerSession(authOptions);

  if (session?.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Auditoría</h1>
        <p className="text-sm text-muted-foreground">
          Quién tocó qué desde el panel de Super Admin, y cuándo. Últimos{" "}
          {MAX_ROWS} cambios.
        </p>
      </div>

      <Card className="py-0">
        {logs.length === 0 ? (
          <CardHeader>
            <CardTitle>Todavía no hay nada registrado</CardTitle>
            <CardDescription>
              Cada cambio que hagan vos o Manuel desde Super Admin (activar un
              módulo, crear un hotel, resetear una contraseña, etc.) va a
              aparecer acá.
            </CardDescription>
          </CardHeader>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cuándo</TableHead>
                <TableHead>Quién</TableHead>
                <TableHead>Qué hizo</TableHead>
                <TableHead>Hotel</TableHead>
                <TableHead>Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {DATETIME_FORMATTER.format(log.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {log.actorName}
                  </TableCell>
                  <TableCell>{formatAuditAction(log.accion)}</TableCell>
                  <TableCell>{log.hotelName ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.detalle ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
