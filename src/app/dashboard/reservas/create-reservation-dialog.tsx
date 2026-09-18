"use client";

import { useState, type FormEvent } from "react";
import type { DocumentType } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DOCUMENT_TYPES, formatDocumentType } from "@/lib/document-type";
import type { ReservationWithRoom, RoomOption } from "./reservations-view";

type CreateReservationDialogProps = {
  rooms: RoomOption[];
  onCreated: (reservation: ReservationWithRoom) => void;
};

export function CreateReservationDialog({
  rooms,
  onCreated,
}: CreateReservationDialogProps) {
  const [open, setOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [dni, setDni] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType>("DNI");
  const [roomType, setRoomType] = useState<string>("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setGuestName("");
    setDni("");
    setDocumentType("DNI");
    setRoomType("");
    setCheckIn("");
    setCheckOut("");
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      resetForm();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (documentType === "DNI" && !/^\d{7,}$/.test(dni)) {
      setError(
        "El DNI debe contener solo números y tener un mínimo de 7 dígitos."
      );
      return;
    }

    if (documentType === "PASAPORTE" && !/^[a-zA-Z0-9]+$/.test(dni)) {
      setError(
        "El pasaporte debe contener solo letras y números, sin espacios."
      );
      return;
    }

    if (!roomType) {
      setError("Selecciona una categoría de habitación.");
      return;
    }

    if (checkOut <= checkIn) {
      setError("La fecha de salida debe ser posterior a la de entrada.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName,
          dni,
          documentType,
          roomType,
          checkIn,
          checkOut,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Request failed");
      }

      const created = (await response.json()) as ReservationWithRoom;
      onCreated(created);
      setOpen(false);
    } catch {
      setError(
        "No se pudo crear la reserva. Verifica la disponibilidad e inténtalo de nuevo."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" />}>Nueva reserva</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="contents">
          <DialogHeader>
            <DialogTitle>Nueva reserva</DialogTitle>
            <DialogDescription>
              Completa los datos para crear una nueva reserva.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="guestName">Nombre del huésped</Label>
              <Input
                id="guestName"
                required
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dni">Documento</Label>
              <div className="flex gap-2">
                <Select
                  value={documentType}
                  onValueChange={(value) =>
                    setDocumentType((value as DocumentType | null) ?? "DNI")
                  }
                >
                  <SelectTrigger className="w-36">
                    <SelectValue>
                      {(value: DocumentType | null) =>
                        value ? formatDocumentType(value) : "Tipo"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {formatDocumentType(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="dni"
                  required
                  className="flex-1"
                  inputMode={documentType === "DNI" ? "numeric" : "text"}
                  value={dni}
                  onChange={(event) => {
                    const val = event.target.value;
                    if (documentType === "DNI") {
                      setDni(val.replace(/\D/g, ""));
                    } else {
                      setDni(val.replace(/[^a-zA-Z0-9]/g, ""));
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="roomType">Categoría de Habitación</Label>
              <Select
                value={roomType}
                onValueChange={(value) => setRoomType(value ?? "")}
              >
                <SelectTrigger id="roomType" className="w-full">
                  <SelectValue placeholder="Selecciona la categoría vendida" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(new Set(rooms.map((r) => r.type))).map(
                    (type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="checkIn">Check-in</Label>
                <Input
                  id="checkIn"
                  type="date"
                  required
                  min={new Date().toLocaleDateString("en-CA")}
                  value={checkIn}
                  onChange={(event) => setCheckIn(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="checkOut">Check-out</Label>
                <Input
                  id="checkOut"
                  type="date"
                  required
                  min={checkIn || new Date().toLocaleDateString("en-CA")}
                  value={checkOut}
                  onChange={(event) => setCheckOut(event.target.value)}
                />
              </div>
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Creando…" : "Crear reserva"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
