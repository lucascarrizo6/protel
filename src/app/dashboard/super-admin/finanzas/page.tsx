import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
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
import { formatCurrency } from "@/lib/format-currency";
import { formatDate } from "@/lib/format-date";
import {
  BILLING_STATUS_BADGE_CLASS,
  BILLING_STATUS_LABELS,
} from "@/lib/super-admin";
import type { BillingStatus } from "@/generated/prisma/enums";

// Mismo orden que en BillingPanel: un hotel sin fila de facturación se
// trata como Pendiente, no como si no debiera nada.
function statusOf(status: BillingStatus | undefined): BillingStatus {
  return status ?? "PENDIENTE";
}

const STATUS_PRIORITY: Record<BillingStatus, number> = {
  VENCIDO: 0,
  PENDIENTE: 1,
  AL_DIA: 2,
};

// Cuántos días antes del vencimiento avisamos, para cobrar antes de que el
// hotel pase a Vencido.
const DIAS_AVISO_VENCIMIENTO = 5;

function diasHasta(fecha: Date, ahora: Date): number {
  const msPorDia = 1000 * 60 * 60 * 24;
  return Math.ceil((fecha.getTime() - ahora.getTime()) / msPorDia);
}

export default async function FinanzasPage() {
  const session = await getServerSession(authOptions);

  if (session?.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const ahora = new Date();

  const hotels = await prisma.hotel.findMany({
    include: { billing: true },
    orderBy: { name: "asc" },
  });

  const rows = hotels
    .map((hotel) => {
      const proximoVencimiento = hotel.billing?.proximoVencimiento ?? null;
      const status = statusOf(hotel.billing?.status);
      const diasParaVencer = proximoVencimiento
        ? diasHasta(proximoVencimiento, ahora)
        : null;
      return {
        id: hotel.id,
        nombre: hotel.name,
        plan: hotel.billing?.plan ?? null,
        monto: hotel.billing?.monto ?? null,
        status,
        proximoVencimiento,
        ultimoPago: hotel.billing?.ultimoPago ?? null,
        // Por vencer: todavía no está Vencido, pero el vencimiento cae
        // dentro de la ventana de aviso (incluye vencimientos ya pasados
        // que quedaron con otro estado cargado a mano).
        porVencer:
          status !== "VENCIDO" &&
          diasParaVencer !== null &&
          diasParaVencer <= DIAS_AVISO_VENCIMIENTO,
        diasParaVencer,
      };
    })
    .sort((a, b) => {
      const byStatus = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
      if (byStatus !== 0) return byStatus;
      return a.nombre.localeCompare(b.nombre);
    });

  const porVencerPronto = rows
    .filter((row) => row.porVencer)
    .sort((a, b) => (a.diasParaVencer ?? 0) - (b.diasParaVencer ?? 0));

  const totalMensual = rows.reduce((sum, row) => sum + (row.monto ?? 0), 0);

  const porEstado = (status: BillingStatus) => {
    const filtered = rows.filter((row) => row.status === status);
    return {
      cantidad: filtered.length,
      monto: filtered.reduce((sum, row) => sum + (row.monto ?? 0), 0),
    };
  };

  const alDia = porEstado("AL_DIA");
  const pendiente = porEstado("PENDIENTE");
  const vencido = porEstado("VENCIDO");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Finanzas</h1>
        <p className="text-sm text-muted-foreground">
          Lo que cada hotel te paga a vos por usar Hotar, todo junto. Para
          cargar un pago o cambiar un plan, entrá al hotel desde{" "}
          <Link href="/dashboard/super-admin" className="underline">
            Super Admin
          </Link>
          .
        </p>
      </div>

      {porVencerPronto.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-yellow-900 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-400">
          <p className="text-sm font-medium">
            {porVencerPronto.length === 1
              ? "Un hotel vence pronto:"
              : `${porVencerPronto.length} hoteles vencen pronto:`}
          </p>
          <ul className="flex flex-col gap-0.5 text-sm">
            {porVencerPronto.map((row) => (
              <li key={row.id}>
                <span className="font-medium">{row.nombre}</span> —{" "}
                {row.diasParaVencer !== null && row.diasParaVencer < 0
                  ? `venció hace ${Math.abs(row.diasParaVencer)} día(s)`
                  : row.diasParaVencer === 0
                    ? "vence hoy"
                    : `vence en ${row.diasParaVencer} día(s)`}{" "}
                ({row.proximoVencimiento ? formatDate(row.proximoVencimiento) : "—"})
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total mensual</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatCurrency(totalMensual)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {rows.length} hotel(es) registrado(s)
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center justify-between">
              <span>Al día</span>
              <Badge className={BILLING_STATUS_BADGE_CLASS.AL_DIA}>
                {alDia.cantidad}
              </Badge>
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatCurrency(alDia.monto)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center justify-between">
              <span>Pendiente</span>
              <Badge className={BILLING_STATUS_BADGE_CLASS.PENDIENTE}>
                {pendiente.cantidad}
              </Badge>
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatCurrency(pendiente.monto)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center justify-between">
              <span>Vencido</span>
              <Badge className={BILLING_STATUS_BADGE_CLASS.VENCIDO}>
                {vencido.cantidad}
              </Badge>
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatCurrency(vencido.monto)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="py-0">
        {rows.length === 0 ? (
          <CardHeader>
            <CardTitle>Todavía no hay hoteles</CardTitle>
            <CardDescription>
              Los hoteles que crees van a aparecer acá con su facturación.
            </CardDescription>
          </CardHeader>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hotel</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Próximo vencimiento</TableHead>
                <TableHead>Último pago</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.nombre}</TableCell>
                  <TableCell>{row.plan || "Sin plan cargado"}</TableCell>
                  <TableCell className="tabular-nums">
                    {row.monto != null ? formatCurrency(row.monto) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className={BILLING_STATUS_BADGE_CLASS[row.status]}>
                      {BILLING_STATUS_LABELS[row.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {row.proximoVencimiento
                      ? formatDate(row.proximoVencimiento)
                      : "—"}
                    {row.porVencer ? (
                      <span className="ml-2 text-xs text-yellow-700 dark:text-yellow-400">
                        (vence pronto)
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {row.ultimoPago ? formatDate(row.ultimoPago) : "—"}
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
