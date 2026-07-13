"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/format-currency";

type RevenueDatum = {
  label: string;
  invoiced: number;
  paid: number;
};

const compactCurrencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  notation: "compact",
  maximumFractionDigits: 1,
});

function niceMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const niceNormalized =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

const TICK_FRACTIONS = [0, 0.25, 0.5, 0.75, 1];

type Hovered = { monthIndex: number; series: "invoiced" | "paid" } | null;

export function RevenueChart({ data }: { data: RevenueDatum[] }) {
  const [hovered, setHovered] = useState<Hovered>(null);

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay facturas registradas.
      </p>
    );
  }

  const max = niceMax(Math.max(...data.map((d) => Math.max(d.invoiced, d.paid))));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-[2px] bg-[var(--series-invoiced)]" />
          Facturado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-[2px] bg-[var(--series-paid)]" />
          Cobrado
        </span>
      </div>

      <div className="flex gap-2">
        <div className="flex h-56 flex-col justify-between py-0 text-right text-xs text-muted-foreground">
          {[...TICK_FRACTIONS].reverse().map((fraction) => (
            <span key={fraction} className="tabular-nums">
              {compactCurrencyFormatter.format(max * fraction)}
            </span>
          ))}
        </div>

        <div className="relative flex h-56 flex-1 items-end justify-around">
          {TICK_FRACTIONS.map((fraction) => (
            <div
              key={fraction}
              className="absolute inset-x-0 border-t border-border"
              style={{ bottom: `${fraction * 100}%` }}
            />
          ))}

          {data.map((datum, monthIndex) => (
            <div
              key={datum.label}
              className="relative z-10 flex h-full flex-1 items-end justify-center gap-1"
            >
              {(
                [
                  ["invoiced", datum.invoiced, "var(--series-invoiced)"],
                  ["paid", datum.paid, "var(--series-paid)"],
                ] as const
              ).map(([series, value, color]) => {
                const isHovered =
                  hovered?.monthIndex === monthIndex && hovered.series === series;
                const heightPct = (value / max) * 100;
                return (
                  <div
                    key={series}
                    className="relative flex h-full w-6 items-end justify-center"
                    onMouseEnter={() => setHovered({ monthIndex, series })}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered({ monthIndex, series })}
                    onBlur={() => setHovered(null)}
                    tabIndex={0}
                    role="img"
                    aria-label={`${series === "invoiced" ? "Facturado" : "Cobrado"} en ${datum.label}: ${formatCurrency(value)}`}
                  >
                    <div
                      className="w-full rounded-t transition-[filter] duration-100"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: color,
                        filter: isHovered ? "brightness(1.15)" : undefined,
                      }}
                    />
                    {isHovered ? (
                      <div className="pointer-events-none absolute bottom-full z-20 mb-2 rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-md">
                        {formatCurrency(value)}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-around pl-8 text-xs text-muted-foreground">
        {data.map((datum) => (
          <span key={datum.label} className="flex-1 text-center capitalize">
            {datum.label}
          </span>
        ))}
      </div>
    </div>
  );
}
