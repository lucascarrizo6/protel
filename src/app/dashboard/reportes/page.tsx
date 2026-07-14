import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
import { formatRoomStatus } from "@/lib/room-status";
import type { RoomStatus } from "@/generated/prisma/enums";
import { OccupancyChart } from "./occupancy-chart";
import { RevenueChart } from "./revenue-chart";

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  month: "short",
  year: "numeric",
});

const ROOM_STATUS_ORDER: RoomStatus[] = [
  "AVAILABLE",
  "OCCUPIED",
  "CLEANING",
  "BLOCKED",
  "MANTENIMIENTO",
];

export default async function ReportesPage() {
  const session = await getServerSession(authOptions);
  const hotelId = session?.user.hotelId;

  const [roomStatusGroups, totalRooms, invoices, reservations] = hotelId
    ? await Promise.all([
        prisma.room.groupBy({
          by: ["status"],
          where: { hotelId },
          _count: { _all: true },
        }),
        prisma.room.count({ where: { hotelId } }),
        prisma.invoice.findMany({
          where: { hotelId },
          select: { amount: true, status: true, createdAt: true },
        }),
        prisma.reservation.findMany({
          where: { hotelId },
          select: { dni: true, checkIn: true, checkOut: true },
        }),
      ])
    : [[], 0, [], []];

  const countByStatus = new Map(
    roomStatusGroups.map((group) => [group.status, group._count._all])
  );

  const occupancyData = ROOM_STATUS_ORDER.map((status) => ({
    status,
    label: formatRoomStatus(status),
    count: countByStatus.get(status) ?? 0,
  }));

  const revenueByMonth = new Map<
    string,
    { label: string; invoiced: number; paid: number }
  >();

  for (const invoice of invoices) {
    const key = `${invoice.createdAt.getFullYear()}-${String(
      invoice.createdAt.getMonth() + 1
    ).padStart(2, "0")}`;
    const label = MONTH_LABEL_FORMATTER.format(invoice.createdAt);
    const bucket = revenueByMonth.get(key) ?? { label, invoiced: 0, paid: 0 };

    bucket.invoiced += invoice.amount;
    if (invoice.status === "PAGADA") {
      bucket.paid += invoice.amount;
    }

    revenueByMonth.set(key, bucket);
  }

  const revenueData = Array.from(revenueByMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => value);

  const now = new Date();
  const guestsThisMonth = new Set(
    reservations
      .filter(
        (reservation) =>
          reservation.checkIn.getFullYear() === now.getFullYear() &&
          reservation.checkIn.getMonth() === now.getMonth()
      )
      .map((reservation) => reservation.dni)
  ).size;

  const averageStayDays =
    reservations.length > 0
      ? reservations.reduce((sum, reservation) => {
          const nights =
            (reservation.checkOut.getTime() - reservation.checkIn.getTime()) /
            (1000 * 60 * 60 * 24);
          return sum + nights;
        }, 0) / reservations.length
      : 0;

  const occupiedRooms = countByStatus.get("OCCUPIED") ?? 0;
  const occupancyPercentage =
    totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
        <p className="text-sm text-muted-foreground">
          Estadísticas de ocupación e ingresos de tu propiedad.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ocupación por estado</CardTitle>
            <CardDescription>
              Habitaciones ocupadas frente al total, por estado actual.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OccupancyChart data={occupancyData} total={totalRooms} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ingresos por mes</CardTitle>
            <CardDescription>
              Total facturado frente a total cobrado, en ARS.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueData} />
          </CardContent>
        </Card>
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Métrica</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">
                Huéspedes este mes
              </TableCell>
              <TableCell className="text-right">{guestsThisMonth}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">
                Duración promedio de estadía
              </TableCell>
              <TableCell className="text-right">
                {averageStayDays.toLocaleString("es-AR", {
                  maximumFractionDigits: 1,
                })}{" "}
                noches
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Porcentaje de ocupación</TableCell>
              <TableCell className="text-right">
                {occupancyPercentage.toLocaleString("es-AR", {
                  maximumFractionDigits: 1,
                })}
                %
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
