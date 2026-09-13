"use client";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Responsive, WidthProvider, type Layouts } from "react-grid-layout";
import type { DashboardData } from "@/lib/dashboard-data";
import { formatCurrency } from "@/lib/format-currency";
import {
  GRID_BREAKPOINTS,
  GRID_COLS,
  GRID_MARGIN,
  GRID_ROW_HEIGHT,
  WIDGETS,
  buildDefaultLayouts,
  reconcileLayouts,
  type WidgetId,
} from "./dashboard-widgets";
import { ArrivalsWidget } from "./arrivals-widget";
import { DeparturesWidget } from "./departures-widget";
import { InHouseWidget, StayoversWidget } from "./stay-widgets";
import { KpiWidget, MetricWidget, TonightWidget } from "./stat-widgets";

const ResponsiveGridLayout = WidthProvider(Responsive);

const STORAGE_PREFIX = "protel:dashboard-layout:v3:";

function loadLayouts(storageKey: string): Layouts {
  if (typeof window === "undefined") return buildDefaultLayouts();
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return buildDefaultLayouts();
    return reconcileLayouts(JSON.parse(raw) as Layouts);
  } catch {
    return buildDefaultLayouts();
  }
}

function renderWidget(id: WidgetId, data: DashboardData) {
  switch (id) {
    case "kpi-rooms":
      return <KpiWidget title="Habitaciones" value={data.kpis.roomsCount} />;
    case "kpi-reservations":
      return (
        <KpiWidget
          title="Reservas activas"
          value={data.kpis.activeReservations}
        />
      );
    case "kpi-housekeeping":
      return (
        <KpiWidget
          title="Mucama pendiente"
          value={data.kpis.pendingTasks}
          hint="tareas sin completar"
          valueClassName={
            data.kpis.pendingTasks > 0
              ? "text-amber-600 dark:text-amber-500"
              : undefined
          }
        />
      );
    case "kpi-balance":
      return (
        <KpiWidget
          title="Saldo pendiente"
          value={formatCurrency(data.kpis.outstandingBalance)}
        />
      );
    case "tonight":
      return <TonightWidget tonight={data.tonight} />;
    case "adr":
      return (
        <MetricWidget
          title="ADR"
          value={data.adr}
          monthLabel={data.monthLabel}
          description="Tarifa promedio por noche vendida"
        />
      );
    case "revpar":
      return (
        <MetricWidget
          title="RevPAR"
          value={data.revpar}
          monthLabel={data.monthLabel}
          description="Ingreso por habitación disponible"
        />
      );
    case "arrivals":
      return <ArrivalsWidget arrivals={data.arrivals} />;
    case "departures":
      return <DeparturesWidget departures={data.departures} />;
    case "in-house":
      return <InHouseWidget inHouse={data.inHouse} />;
    case "stayovers":
      return <StayoversWidget stayovers={data.stayovers} />;
    default:
      return null;
  }
}

export function DashboardGrid({
  data,
  userId,
}: {
  data: DashboardData;
  userId: string;
}) {
  const storageKey = STORAGE_PREFIX + userId;
  const [mounted, setMounted] = useState(false);
  const [layouts, setLayouts] = useState<Layouts>(() => buildDefaultLayouts());

  useEffect(() => {
    setLayouts(loadLayouts(storageKey));
    setMounted(true);
  }, [storageKey]);

  const handleLayoutChange = useCallback(
    (_current: unknown, allLayouts: Layouts) => {
      if (!mounted) return;
      setLayouts(allLayouts);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(allLayouts));
      } catch {
        /* localStorage lleno o no disponible: el layout sigue en memoria */
      }
    },
    [mounted, storageKey]
  );

  const resetLayout = useCallback(() => {
    const defaults = buildDefaultLayouts();
    setLayouts(defaults);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      /* no-op */
    }
  }, [storageKey]);

  const children = useMemo(
    () =>
      WIDGETS.map((widget) => (
        <div key={widget.id} className="overflow-hidden">
          {renderWidget(widget.id, data)}
        </div>
      )),
    [data]
  );

  if (!mounted) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {WIDGETS.map((widget) => (
          <div
            key={widget.id}
            className="h-20 animate-pulse rounded-lg border bg-muted/40"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={resetLayout}
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Restablecer diseño
        </button>
      </div>
      <ResponsiveGridLayout
        layouts={layouts}
        breakpoints={GRID_BREAKPOINTS}
        cols={GRID_COLS}
        rowHeight={GRID_ROW_HEIGHT}
        margin={GRID_MARGIN}
        containerPadding={[0, 0]}
        draggableHandle=".widget-drag-handle"
        resizeHandles={["se"]}
        compactType="vertical"
        preventCollision={false}
        onLayoutChange={handleLayoutChange}
        isBounded
      >
        {children}
      </ResponsiveGridLayout>
    </div>
  );
}
