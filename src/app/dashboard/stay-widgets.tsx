import type { StayRow } from "@/lib/dashboard-data";
import { formatDate } from "@/lib/format-date";
import { WidgetShell, WidgetEmpty } from "./widget-shell";

function StayList({
  stays,
  empty,
}: {
  stays: StayRow[];
  empty: string;
}) {
  if (stays.length === 0) {
    return <WidgetEmpty>{empty}</WidgetEmpty>;
  }
  return (
    <ul className="flex flex-col divide-y">
      {stays.map((stay) => (
        <li
          key={stay.id}
          className="flex items-center justify-between gap-3 py-1.5 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium leading-tight">
              {stay.guestName}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Hab. {stay.roomNumber}
            </p>
          </div>
          <p className="shrink-0 text-[11px] text-muted-foreground">
            {formatDate(new Date(stay.checkIn))} →{" "}
            {formatDate(new Date(stay.checkOut))}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function InHouseWidget({ inHouse }: { inHouse: StayRow[] }) {
  return (
    <WidgetShell title={`In-house ahora (${inHouse.length})`}>
      <StayList stays={inHouse} empty="No hay huéspedes alojados en este momento." />
    </WidgetShell>
  );
}

export function StayoversWidget({ stayovers }: { stayovers: StayRow[] }) {
  return (
    <WidgetShell title={`Se quedan otra noche (${stayovers.length})`}>
      <StayList
        stays={stayovers}
        empty="Ningún huésped continúa después de hoy."
      />
    </WidgetShell>
  );
}
