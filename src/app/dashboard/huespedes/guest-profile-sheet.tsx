"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format-date";
import { formatCurrency } from "@/lib/format-currency";
import { formatDocument } from "@/lib/document-type";
import type { GuestRowDTO } from "./guests-view";

const FORM_FIELDS = [
  ["prefRecepcion", "Recepción", "almohadas extra, piso alto…"],
  ["prefMucama", "Mucama", "toallas extra, no molestar…"],
  ["prefCocina", "Cocina", "sin TACC, sopa bien caliente…"],
] as const;

type GuestProfileSheetProps = {
  guest: GuestRowDTO | null;
  onOpenChange: (open: boolean) => void;
};

export function GuestProfileSheet({ guest, onOpenChange }: GuestProfileSheetProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    prefRecepcion: guest?.profile?.prefRecepcion ?? "",
    prefMucama: guest?.profile?.prefMucama ?? "",
    prefCocina: guest?.profile?.prefCocina ?? "",
    vip: guest?.profile?.vip ?? false,
    vipMotivo: guest?.profile?.vipMotivo ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!guest) return;
    setSaving(true);
    try {
      const response = await fetch("/api/guest-profiles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dni: guest.dni,
          documentType: guest.documentType,
          ...form,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo guardar.");
      }
      toast.success("Perfil del huésped guardado.");
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={guest !== null}
      onOpenChange={(next) => {
        if (!next) onOpenChange(false);
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{guest?.name}</SheetTitle>
          <SheetDescription>
            {guest ? formatDocument(guest.documentType, guest.dni) : ""}
          </SheetDescription>
        </SheetHeader>

        {guest ? (
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border p-2">
                <p className="text-lg font-semibold">{guest.totalStays}</p>
                <p className="text-xs text-muted-foreground">estadías</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-sm font-semibold">
                  {formatDate(new Date(guest.lastVisit))}
                </p>
                <p className="text-xs text-muted-foreground">última visita</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-sm font-semibold">
                  {formatCurrency(guest.totalSpent)}
                </p>
                <p className="text-xs text-muted-foreground">gastado</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="guest-vip" className="flex items-center gap-1.5">
                  <Star className="size-4 text-amber-400" />
                  Huésped VIP
                </Label>
                <Switch
                  id="guest-vip"
                  checked={form.vip}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, vip: checked }))
                  }
                />
              </div>
              {form.vip ? (
                <Input
                  value={form.vipMotivo}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      vipMotivo: event.target.value,
                    }))
                  }
                  placeholder="Por qué es VIP (dueño de agencia, cliente frecuente…)"
                />
              ) : null}
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">Preferencias por área</p>
              {FORM_FIELDS.map(([key, label, placeholder]) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <Label htmlFor={`guest-${key}`}>{label}</Label>
                  <Textarea
                    id={`guest-${key}`}
                    rows={2}
                    value={form[key]}
                    placeholder={placeholder}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        [key]: event.target.value,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
