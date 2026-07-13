import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format-currency";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const hotelId = session?.user.hotelId;

  const [roomsCount, activeReservationsCount, pendingTasksCount, invoiceTotals] =
    hotelId
      ? await Promise.all([
          prisma.room.count({ where: { hotelId } }),
          prisma.reservation.count({
            where: { hotelId, status: { in: ["CONFIRMADA", "PENDIENTE"] } },
          }),
          prisma.housekeepingTask.count({
            where: { hotelId, status: "PENDIENTE" },
          }),
          prisma.invoice.aggregate({
            where: { hotelId, status: "PENDIENTE" },
            _sum: { amount: true },
          }),
        ])
      : [0, 0, 0, { _sum: { amount: null } }];

  const outstandingBalance = invoiceTotals._sum.amount ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Bienvenido, {session?.user.name ?? session?.user.email}
        </h1>
        <p className="text-sm text-muted-foreground">
          Aquí tienes un resumen de tu propiedad.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Habitaciones</CardDescription>
            <CardTitle className="text-2xl">{roomsCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Reservas activas</CardDescription>
            <CardTitle className="text-2xl">{activeReservationsCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Tareas de mucama pendientes</CardDescription>
            <CardTitle className="text-2xl">{pendingTasksCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Saldo pendiente</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(outstandingBalance)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
