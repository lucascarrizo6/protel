"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star } from "lucide-react";
import type { PaymentMethod } from "@/generated/prisma/enums";
import type { ArrivalRow } from "@/lib/dashboard-data";
import { formatCurrency } from "@/lib/format-currency";
import { PAYMENT_METHODS, formatPaymentMethod } from "@/lib/payment-method";
import {
  guestProfileHasNotice,
  type GuestProfileDTO,
} from "@/lib/guest-profile";
import { GuestPreferencesNotice } from "@/components/dashboard/guest-preferences-notice";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WidgetShell, WidgetEmpty } from "./widget-shell";

function arrivalToProfile(arrival: ArrivalRow): GuestProfileDTO {
  return {
    dni: "",
    documentType: "DNI",
    prefRecepcion: arrival.prefRecepcion,
    prefMucama: arrival.prefMucama,
    prefCocina: arrival.prefCocina,
    vip: arrival.vip,
    vipMotivo: arrival.vipMotivo,
  };
}

export function ArrivalsWidget({ arrivals }: { arrivals: ArrivalRow[] }) {
  const router = useRouter();
  const [target, setTarget] = useState<ArrivalRow | null>(null);
  const [prefsTarget, setPrefsTarget] = useState<ArrivalRow | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function openCheckIn(arrival: ArrivalRow) {
    setTarget(arrival);
    setPaymentMethod("");
    setError(null);
  }

  function startCheckIn(arrival: ArrivalRow) {
    if (guestProfileHasNotice(arrivalToProfile(arrival))) {
      setPrefsTarget(arrival);
    } else {
      openCheckIn(arrival);
    }
  }

  async function confirmCheckIn() {
    if (!target) return;
    if (!paymentMethod) {
      setError("Seleccioná un método de pago.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/reservations/${target.id}/check-in`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo hacer el check-in.");
      }
      toast.success(`Check-in de ${target.guestName} confirmado.`);
      setTarget(null);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo hacer el check-in."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <WidgetShell title="Llegadas de hoy">
      {arrivals.length === 0 ? (
        <WidgetEmpty>No hay llegadas pendientes para hoy.</WidgetEmpty>
      ) : (
        <ul className="flex flex-col divide-y">
          {arrivals.map((arrival) => (
            <li
              key={arrival.id}
              className="flex items-center justify-between gap-3 py-1.5 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium leading-tight">
                  {arrival.vip ? (
                    <Star
                      className="mr-1 inline size-3 -translate-y-px fill-amber-400 text-amber-400"
                      aria-label="VIP"
                    />
                  ) : null}
                  {arrival.guestName}
                  {arrival.esFree ? (
                    <Badge
                      variant="secondary"
                      className="ml-1.5 align-middle text-[10px]"
                    >
                      FREE
                    </Badge>
                  ) : null}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Hab. {arrival.roomNumber} · {arrival.nights} noche(s) ·{" "}
                  {formatCurrency(arrival.amount)}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 shrink-0 border-green-600/30 bg-green-100 px-2 text-xs text-green-800 hover:bg-green-200 dark:bg-green-500/15 dark:text-green-400 dark:hover:bg-green-500/25"
                onClick={() => startCheckIn(arrival)}
              >
                Check-in
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={prefsTarget !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPrefsTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Antes del check-in de {prefsTarget?.guestName}
            </DialogTitle>
            <DialogDescription>
              Este huésped tiene indicaciones cargadas. Tenelas presentes al
              recibirlo.
            </DialogDescription>
          </DialogHeader>

          {prefsTarget ? (
            <GuestPreferencesNotice profile={arrivalToProfile(prefsTarget)} />
          ) : null}

          <DialogFooter>
            <Button
              onClick={() => {
                const arrival = prefsTarget;
                setPrefsTarget(null);
                if (arrival) openCheckIn(arrival);
              }}
            >
              Entendido, seguir al cobro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={target !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cobro de alojamiento</DialogTitle>
            <DialogDescription>
              Confirmá el pago para hacer check-in de {target?.guestName}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              Habitación {target?.roomNumber} · {target?.nights} noche(s)
              <p className="mt-1 text-base font-semibold text-foreground">
                {formatCurrency(target?.amount ?? 0)}
              </p>
              {target && target.amount > 0 && target.nights > 0 ? (
                <p className="mt-0.5 text-xs">
                  {target.nights} noche(s) ×{" "}
                  {formatCurrency(target.amount / target.nights)}. El total se
                  calcula solo, no se edita.
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dashboardCheckinPaymentMethod">
                Método de pago
              </Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) =>
                  setPaymentMethod((value as PaymentMethod | null) ?? "")
                }
              >
                <SelectTrigger
                  id="dashboardCheckinPaymentMethod"
                  className="w-full"
                >
                  <SelectValue placeholder="Seleccioná un método de pago">
                    {(value: PaymentMethod | null) =>
                      value
                        ? formatPaymentMethod(value)
                        : "Seleccioná un método de pago"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {formatPaymentMethod(method)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              ¿Pago con MercadoPago o link de pago? Usá el check-in desde{" "}
              <span className="font-medium">Reservas</span>.
            </p>
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
            <Button onClick={confirmCheckIn} disabled={isSaving}>
              {isSaving ? "Confirmando…" : "Confirmar pago y check-in"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WidgetShell>
  );
}
