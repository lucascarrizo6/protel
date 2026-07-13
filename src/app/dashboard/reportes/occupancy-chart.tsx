"use client";

import { useState } from "react";
import type { RoomStatus } from "@/generated/prisma/enums";

type OccupancyDatum = {
  status: RoomStatus;
  label: string;
  count: number;
};

const STATUS_VAR: Record<RoomStatus, string> = {
  AVAILABLE: "var(--status-available)",
  OCCUPIED: "var(--status-occupied)",
  CLEANING: "var(--status-cleaning)",
  BLOCKED: "var(--status-blocked)",
};

export function OccupancyChart({
  data,
  total,
}: {
  data: OccupancyDatum[];
  total: number;
}) {
  const [hovered, setHovered] = useState<RoomStatus | null>(null);

  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay habitaciones cargadas.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {data.map((datum) => {
        const percentage = (datum.count / total) * 100;
        const isHovered = hovered === datum.status;

        return (
          <div key={datum.status} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <span
                  className="inline-block size-2.5 rounded-full"
                  style={{ backgroundColor: STATUS_VAR[datum.status] }}
                  aria-hidden
                />
                {datum.label}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {datum.count} · {percentage.toLocaleString("es-AR", { maximumFractionDigits: 0 })}%
              </span>
            </div>
            <div
              className="group relative h-3 w-full overflow-hidden rounded-full bg-muted"
              onMouseEnter={() => setHovered(datum.status)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(datum.status)}
              onBlur={() => setHovered(null)}
              tabIndex={0}
              role="img"
              aria-label={`${datum.label}: ${datum.count} de ${total} habitaciones (${percentage.toFixed(0)}%)`}
            >
              <div
                className="h-full rounded-full transition-[filter] duration-100"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: STATUS_VAR[datum.status],
                  filter: isHovered ? "brightness(1.15)" : undefined,
                }}
              />
              {isHovered ? (
                <div className="pointer-events-none absolute -top-9 left-0 z-10 rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-md">
                  <span className="font-medium">{datum.count}</span> habitaciones ·{" "}
                  {percentage.toLocaleString("es-AR", { maximumFractionDigits: 1 })}%
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
