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
import { formatCurrency } from "@/lib/format-currency";
import { formatDate } from "@/lib/format-date";
import {
  BILLING_STATUS_BADGE_CLASS,
  BILLING_STATUS_LABELS,
  DEFAULT_HOTEL_MODULES,
  HOTEL_MODULE_KEYS,
  HOTEL_MODULE_LABELS,
  type HotelModuleKey,
} from "@/lib/super-admin";
import { ModulesDonut, type ModuleSlice } from "./modules-donut";

function mesesComoCliente(desde: Date, hasta: Date): number {
  const meses =
    (hasta.getFullYear() - desde.getFullYear()) * 12 +
    (hasta.getMonth() - desde.getMonth());
  return Math.max(meses, 0);
}

function StatPair({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-md border p-2">
      <span className="text-base font-semibold tabular-nums leading-tight">
        {value}
      </span>
      <span className="text-center text-[10px] leading-tight text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export default async function MetricasPage() {
  const session = await getServerSession(authOptions);

  if (session?.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const now = new Date();

  const hotels = await prisma.hotel.findMany({
    include: {
      modules: true,
      billing: true,
      _count: { select: { users: true } },
    },
    orderBy: { name: "asc" },
  });

  const totalHotels = hotels.length;

  function isOn(
    modules: Record<HotelModuleKey, boolean> | null,
    key: HotelModuleKey
  ) {
    return modules?.[key] ?? DEFAULT_HOTEL_MODULES[key];
  }

  const counts = HOTEL_MODULE_KEYS.map((key) => ({
    key,
    count: hotels.filter((hotel) => isOn(hotel.modules, key)).length,
  }));
  const totalActivations = counts.reduce((sum, c) => sum + c.count, 0);

  const slices: ModuleSlice[] = counts
    .map(({ key, count }) => ({
      key,
      label: HOTEL_MODULE_LABELS[key],
      count,
      totalHotels,
      pct: totalActivations > 0 ? (count / totalActivations) * 100 : 0,
      color: `var(--module-${key})`,
    }))
    .sort((a, b) => b.count - a.count);

  const masUsado = slices[0] ?? null;
  const menosUsado = slices.length > 0 ? slices[slices.length - 1] : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Métricas</h1>
        <p className="text-sm text-muted-foreground">
          Qué tan usado está cada módulo en toda la plataforma, y cómo viene
          cada hotel puntual.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uso de módulos en toda la plataforma</CardTitle>
          <CardDescription>
            De cada 100 módulos prendidos entre todos los hoteles, cuántos son
            de cada tipo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {totalHotels === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay hoteles para medir.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 text-xs">
                {masUsado ? (
                  <Badge variant="outline">
                    Más usado: {masUsado.label} ({masUsado.count}/{totalHotels}{" "}
                    hoteles)
                  </Badge>
                ) : null}
                {menosUsado ? (
                  <Badge variant="outline">
                    Menos usado: {menosUsado.label} ({menosUsado.count}/
                    {totalHotels} hoteles)
                  </Badge>
                ) : null}
              </div>
              <ModulesDonut slices={slices} totalHotels={totalHotels} />
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold tracking-tight">
          Lo que nos deja cada hotel
        </h2>
        <p className="text-sm text-muted-foreground">
          Cuánto nos paga cada uno y cuánto lleva generado desde que es
          cliente.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {hotels.map((hotel) => {
          const billingStatus = hotel.billing?.status ?? "PENDIENTE";
          const monto = hotel.billing?.monto ?? 0;
          const antiguedad = mesesComoCliente(hotel.createdAt, now);
          const generadoEstimado = monto * antiguedad;

          return (
            <Card key={hotel.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{hotel.name}</CardTitle>
                  <CardDescription>
                    {hotel.billing?.plan || "Sin plan cargado"}
                  </CardDescription>
                </div>
                <Badge className={BILLING_STATUS_BADGE_CLASS[billingStatus]}>
                  {BILLING_STATUS_LABELS[billingStatus]}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <StatPair
                    label="Paga por mes"
                    value={formatCurrency(monto)}
                  />
                  <StatPair
                    label="Generado (estimado)"
                    value={formatCurrency(generadoEstimado)}
                  />
                </div>

                <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                  <span>
                    Cliente desde {formatDate(hotel.createdAt)} (
                    {antiguedad} {antiguedad === 1 ? "mes" : "meses"})
                  </span>
                  <span>
                    Próximo vencimiento:{" "}
                    {hotel.billing?.proximoVencimiento
                      ? formatDate(hotel.billing.proximoVencimiento)
                      : "—"}
                  </span>
                  <span>
                    Último pago:{" "}
                    {hotel.billing?.ultimoPago
                      ? formatDate(hotel.billing.ultimoPago)
                      : "—"}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
