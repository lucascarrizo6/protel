import { formatCurrency } from "@/lib/format-currency";
import { cn } from "@/lib/utils";
import type { DashboardData } from "@/lib/dashboard-data";
import { WidgetShell } from "./widget-shell";

/** Color del % de ocupación: verde si está lleno, rojo si está muy vacío. */
function occupancyColor(pct: number): string {
  if (pct >= 80) return "text-green-600 dark:text-green-500";
  if (pct < 20) return "text-red-600 dark:text-red-500";
  return "text-foreground";
}

export function KpiWidget({
  title,
  value,
  hint,
  valueClassName,
}: {
  title: string;
  value: string | number;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <WidgetShell title={title} bodyClassName="flex flex-col justify-center">
      <p
        className={cn(
          "text-lg font-semibold leading-tight tracking-tight tabular-nums",
          valueClassName
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>
      ) : null}
    </WidgetShell>
  );
}

export function TonightWidget({ tonight }: { tonight: DashboardData["tonight"] }) {
  const { occupied, total, pct } = tonight;
  return (
    <WidgetShell
      title="Ocupación de esta noche"
      bodyClassName="flex flex-col justify-center gap-1.5"
    >
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "text-4xl font-bold leading-none tracking-tight tabular-nums",
            occupancyColor(pct)
          )}
        >
          {pct}%
        </span>
        <span className="text-[11px] text-muted-foreground">
          {occupied}/{total} hab.
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 80
              ? "bg-green-500"
              : pct < 20
                ? "bg-red-500"
                : "bg-primary"
          )}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </WidgetShell>
  );
}

export function MetricWidget({
  title,
  value,
  monthLabel,
  description,
}: {
  title: string;
  value: number;
  monthLabel: string;
  description: string;
}) {
  return (
    <WidgetShell title={title} bodyClassName="flex flex-col justify-center gap-0.5">
      <p className="text-lg font-semibold leading-tight tracking-tight tabular-nums">
        {formatCurrency(value)}
      </p>
      <p className="text-[10px] leading-tight text-muted-foreground">
        {description} · {monthLabel}
      </p>
    </WidgetShell>
  );
}
