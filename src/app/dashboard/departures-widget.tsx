"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { DepartureRow } from "@/lib/dashboard-data";
import { formatCurrency } from "@/lib/format-currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WidgetShell, WidgetEmpty } from "./widget-shell";

export function DeparturesWidget({
  departures,
}: {
  departures: DepartureRow[];
}) {
  const router = useRouter();
  const [target, setTarget] = useState<DepartureRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function confirmCheckOut() {
    if (!target) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/reservations/${target.id}/check-out`, {
        method: "PATCH",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo hacer el check-out.");
      }
      toast.success(`Check-out de ${target.guestName} confirmado.`);
      setTarget(null);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo hacer el check-out."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <WidgetShell title="Salidas de hoy">
      {departures.length === 0 ? (
        <WidgetEmpty>No hay salidas para hoy.</WidgetEmpty>
      ) : (
        <ul className="flex flex-col divide-y">
          {departures.map((departure) => (
            <li
              key={departure.id}
              className="flex items-center justify-between gap-3 py-1.5 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium leading-tight">
                  {departure.guestName}
                  {departure.overdue ? (
                    <Badge
                      variant="secondary"
                      className="ml-1.5 align-middle bg-yellow-100 text-[10px] text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400"
                    >
                      Vencida
                    </Badge>
                  ) : null}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Hab. {departure.roomNumber}
                  {departure.extrasTotal > 0
                    ? ` · consumos ${formatCurrency(departure.extrasTotal)}`
                    : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 shrink-0 px-2 text-xs"
                onClick={() => {
                  setTarget(departure);
                  setError(null);
                }}
              >
                Check-out
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={target !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar check-out</DialogTitle>
            <DialogDescription>
              {target?.guestName} · habitación {target?.roomNumber}.
            </DialogDescription>
          </DialogHeader>

          <div className="text-sm text-muted-foreground">
            {target && target.extrasTotal > 0 ? (
              <p>
                Se generará una factura de consumos por{" "}
                <span className="font-medium text-foreground">
                  {formatCurrency(target.extrasTotal)}
                </span>{" "}
                y la habitación pasará a limpieza.
              </p>
            ) : (
              <p>La habitación pasará a limpieza.</p>
            )}
            {error ? (
              <p role="alert" className="mt-2 text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTarget(null)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCheckOut}
              disabled={isSaving}
            >
              {isSaving ? "Procesando…" : "Confirmar check-out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WidgetShell>
  );
}
