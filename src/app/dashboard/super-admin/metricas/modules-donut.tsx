"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type ModuleSlice = {
  key: string;
  label: string;
  count: number;
  totalHotels: number;
  pct: number;
  color: string;
};

const RADIUS = 70;
const STROKE = 26;
const GAP_UNITS = 0.6;

export function ModulesDonut({
  slices,
  totalHotels,
}: {
  slices: ModuleSlice[];
  totalHotels: number;
}) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  let acc = 0;
  const positioned = slices.map((slice) => {
    const offset = acc;
    acc += slice.pct;
    return { ...slice, offset };
  });

  const hovered = positioned.find((s) => s.key === hoveredKey) ?? null;

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <div className="relative mx-auto size-[180px] shrink-0">
        <svg
          viewBox="0 0 180 180"
          className="size-full -rotate-90"
          role="img"
          aria-label="Distribución de uso de módulos en la plataforma"
        >
          <circle
            cx="90"
            cy="90"
            r={RADIUS}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={STROKE}
          />
          {positioned.map((slice) => {
            const len = Math.max(slice.pct - GAP_UNITS, 0);
            const isHovered = hoveredKey === slice.key;
            return (
              <circle
                key={slice.key}
                cx="90"
                cy="90"
                r={RADIUS}
                fill="none"
                stroke={slice.color}
                strokeWidth={isHovered ? STROKE + 6 : STROKE}
                strokeDasharray={`${len} ${100 - len}`}
                strokeDashoffset={-slice.offset}
                pathLength={100}
                strokeLinecap="butt"
                className="cursor-pointer transition-[stroke-width] duration-150"
                onPointerEnter={() => setHoveredKey(slice.key)}
                onPointerLeave={() =>
                  setHoveredKey((current) => (current === slice.key ? null : current))
                }
              >
                <title>
                  {`${slice.label}: ${slice.count} de ${slice.totalHotels} hoteles · ${slice.pct.toFixed(0)}% del uso total`}
                </title>
              </circle>
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {hovered ? (
            <>
              <span className="text-xs font-medium leading-tight">
                {hovered.label}
              </span>
              <span className="text-lg font-semibold tabular-nums leading-tight">
                {hovered.pct.toFixed(0)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-lg font-semibold tabular-nums leading-tight">
                {totalHotels}
              </span>
              <span className="text-xs text-muted-foreground leading-tight">
                hotel(es)
              </span>
            </>
          )}
        </div>
      </div>

      <ul className="flex w-full flex-col gap-1.5">
        {positioned.map((slice) => (
          <li
            key={slice.key}
            className={cn(
              "flex items-center justify-between gap-3 rounded-md px-2 py-1 text-sm transition-colors",
              hoveredKey === slice.key && "bg-muted"
            )}
            onPointerEnter={() => setHoveredKey(slice.key)}
            onPointerLeave={() =>
              setHoveredKey((current) => (current === slice.key ? null : current))
            }
          >
            <span className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              {slice.label}
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {slice.count}/{slice.totalHotels} · {slice.pct.toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
