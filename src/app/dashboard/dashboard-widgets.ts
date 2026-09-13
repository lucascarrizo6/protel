import type { Layout, Layouts } from "react-grid-layout";

export type WidgetId =
  | "kpi-rooms"
  | "kpi-reservations"
  | "kpi-housekeeping"
  | "kpi-balance"
  | "tonight"
  | "adr"
  | "revpar"
  | "arrivals"
  | "departures"
  | "in-house"
  | "stayovers";

export const GRID_COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 } as const;
export const GRID_BREAKPOINTS = {
  lg: 1200,
  md: 996,
  sm: 768,
  xs: 480,
  xxs: 0,
} as const;
export const GRID_ROW_HEIGHT = 56;
export const GRID_MARGIN: [number, number] = [12, 12];

type Box = { x: number; y: number; w: number; h: number };

type WidgetDef = {
  id: WidgetId;
  minW: number;
  minH: number;
  /** Grilla ancha, 12 columnas. Cada fila suma 12, sin huecos. */
  lg: Box;
  /** Grilla media, 10 columnas. Cada fila suma 10, sin huecos. */
  md: Box;
};

// Alturas en filas de grilla (rowHeight 56 + margin 12 => fila ≈ 68px):
//   h2 ≈ 124px  ·  h5 ≈ 328px  ·  h6 ≈ 396px
export const WIDGETS: WidgetDef[] = [
  { id: "kpi-rooms",        minW: 2, minH: 2, lg: { x: 0, y: 0, w: 3, h: 2 }, md: { x: 0, y: 0, w: 5, h: 2 } },
  { id: "kpi-reservations", minW: 2, minH: 2, lg: { x: 3, y: 0, w: 3, h: 2 }, md: { x: 5, y: 0, w: 5, h: 2 } },
  { id: "kpi-housekeeping", minW: 2, minH: 2, lg: { x: 6, y: 0, w: 3, h: 2 }, md: { x: 0, y: 2, w: 5, h: 2 } },
  { id: "kpi-balance",      minW: 2, minH: 2, lg: { x: 9, y: 0, w: 3, h: 2 }, md: { x: 5, y: 2, w: 5, h: 2 } },
  { id: "tonight",          minW: 3, minH: 2, lg: { x: 0, y: 2, w: 4, h: 2 }, md: { x: 0, y: 4, w: 10, h: 2 } },
  { id: "adr",              minW: 2, minH: 2, lg: { x: 4, y: 2, w: 4, h: 2 }, md: { x: 0, y: 6, w: 5, h: 2 } },
  { id: "revpar",           minW: 2, minH: 2, lg: { x: 8, y: 2, w: 4, h: 2 }, md: { x: 5, y: 6, w: 5, h: 2 } },
  { id: "arrivals",         minW: 3, minH: 3, lg: { x: 0, y: 4, w: 6, h: 6 }, md: { x: 0, y: 8, w: 10, h: 6 } },
  { id: "departures",       minW: 3, minH: 3, lg: { x: 6, y: 4, w: 6, h: 6 }, md: { x: 0, y: 14, w: 10, h: 6 } },
  { id: "in-house",         minW: 3, minH: 3, lg: { x: 0, y: 10, w: 6, h: 5 }, md: { x: 0, y: 20, w: 10, h: 6 } },
  { id: "stayovers",        minW: 3, minH: 3, lg: { x: 6, y: 10, w: 6, h: 5 }, md: { x: 0, y: 26, w: 10, h: 6 } },
];

export const WIDGET_IDS = WIDGETS.map((widget) => widget.id);

function toLayout(id: WidgetId, box: Box, minW: number, minH: number): Layout {
  return { i: id, ...box, minW, minH };
}

/** Apila los widgets a lo ancho, en el orden del registro (pantallas chicas). */
function stack(cols: number): Layout[] {
  let y = 0;
  return WIDGETS.map((widget) => {
    const h = Math.max(widget.minH, widget.lg.h);
    const item = toLayout(
      widget.id,
      { x: 0, y, w: cols, h },
      Math.min(widget.minW, cols),
      widget.minH
    );
    y += h;
    return item;
  });
}

export function buildDefaultLayouts(): Layouts {
  return {
    lg: WIDGETS.map((w) => toLayout(w.id, w.lg, w.minW, w.minH)),
    md: WIDGETS.map((w) => toLayout(w.id, w.md, Math.min(w.minW, GRID_COLS.md), w.minH)),
    sm: stack(GRID_COLS.sm),
    xs: stack(GRID_COLS.xs),
    xxs: stack(GRID_COLS.xxs),
  };
}

const KNOWN_IDS = new Set<string>(WIDGET_IDS);

/** Sanea un layout guardado: descarta ids desconocidos y agrega al final los
 *  widgets nuevos que todavía no estén en el layout persistido. */
export function reconcileLayouts(saved: Layouts | null): Layouts {
  const defaults = buildDefaultLayouts();
  if (!saved || typeof saved !== "object") return defaults;

  const result: Layouts = {};
  for (const breakpoint of Object.keys(defaults) as (keyof Layouts)[]) {
    const defaultItems = defaults[breakpoint] ?? [];
    const savedItems = (saved[breakpoint] ?? []).filter(
      (item) => item && KNOWN_IDS.has(item.i)
    );
    if (savedItems.length === 0) {
      result[breakpoint] = defaultItems;
      continue;
    }
    const savedIds = new Set(savedItems.map((item) => item.i));
    const missing = defaultItems.filter((item) => !savedIds.has(item.i));
    result[breakpoint] = [...savedItems, ...missing];
  }
  return result;
}
