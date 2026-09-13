"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star } from "lucide-react";
import type { DocumentType } from "@/generated/prisma/enums";
import type { GuestProfileDTO } from "@/lib/guest-profile";
import { formatDate } from "@/lib/format-date";
import { formatCurrency } from "@/lib/format-currency";
import { formatDocument } from "@/lib/document-type";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type GuestRowDTO = {
  dni: string;
  documentType: DocumentType;
  name: string;
  totalStays: number;
  lastVisit: string;
  totalSpent: number;
  profile: GuestProfileDTO | null;
};

const EMPTY_FORM = {
  prefRecepcion: "",
  prefMucama: "",
  prefCocina: "",
  vip: false,
  vipMotivo: "",
};

export function GuestsView({ guests }: { guests: GuestRowDTO[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<GuestRowDTO | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function openGuest(guest: GuestRowDTO) {
    setSelected(guest);
    setForm({
      prefRecepcion: guest.profile?.prefRecepcion ?? "",
      prefMucama: guest.profile?.prefMucama ?? "",
      prefCocina: guest.profile?.prefCocina ?? "",
      vip: guest.profile?.vip ?? false,
      vipMotivo: guest.profile?.vipMotivo ?? "",
    });
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    try {
      const response = await fetch("/api/guest-profiles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dni: selected.dni,
          documentType: selected.documentType,
          ...form,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo guardar.");
      }
      toast.success("Perfil del huésped guardado.");
      setSelected(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Estadías totales</TableHead>
              <TableHead>Última visita</TableHead>
              <TableHead>Total gastado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guests.map((guest) => (
              <TableRow
                key={`${guest.documentType}:${guest.dni}`}
                className="cursor-pointer"
                onClick={() => openGuest(guest)}
              >
                <TableCell className="font-medium">
                  {guest.profile?.vip ? (
                    <Star
                      className="mr-1 inline size-3.5 -translate-y-px fill-amber-400 text-amber-400"
                      aria-label="VIP"
                    />
                  ) : null}
                  {guest.name}
                </TableCell>
                <TableCell>
                  {formatDocument(guest.documentType, guest.dni)}
                </TableCell>
                <TableCell>{guest.totalStays}</TableCell>
                <TableCell>{formatDate(new Date(guest.lastVisit))}</TableCell>
                <TableCell>{formatCurrency(guest.totalSpent)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Sheet
        open={selected !== null}
        onOpenChange={(next) => {
          if (!next) setSelected(null);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{selected?.name}</SheetTitle>
            <SheetDescription>
              {selected
                ? formatDocument(selected.documentType, selected.dni)
                : ""}
            </SheetDescription>
          </SheetHeader>

          {selected ? (
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md border p-2">
                  <p className="text-lg font-semibold">{selected.totalStays}</p>
                  <p className="text-xs text-muted-foreground">estadías</p>
                </div>
                <div className="rounded-md border p-2">
                  <p className="text-sm font-semibold">
                    {formatDate(new Date(selected.lastVisit))}
                  </p>
                  <p className="text-xs text-muted-foreground">última visita</p>
                </div>
                <div className="rounded-md border p-2">
                  <p className="text-sm font-semibold">
                    {formatCurrency(selected.totalSpent)}
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
                {(
                  [
                    ["prefRecepcion", "Recepción", "almohadas extra, piso alto…"],
                    ["prefMucama", "Mucama", "toallas extra, no molestar…"],
                    ["prefCocina", "Cocina", "sin TACC, sopa bien caliente…"],
                  ] as const
                ).map(([key, label, placeholder]) => (
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
              onClick={() => setSelected(null)}
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
    </>
  );
}
