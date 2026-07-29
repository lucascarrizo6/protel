"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
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
import { formatCurrency } from "@/lib/format-currency";
import { nightsBetween } from "@/lib/nights-between";
import { cn } from "@/lib/utils";
import type { DocumentType } from "@/generated/prisma/enums";
import { BookingHeader } from "./booking-header";

type AvailableRoom = {
  id: string;
  numero: string;
  tipo: string;
  precio: number;
  capacidad: number;
};

const STEPS = [
  { id: 1, label: "Fechas" },
  { id: 2, label: "Habitación" },
  { id: 3, label: "Datos y pago" },
] as const;

const BLUE = "#0047CC";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function BookingWizard({
  slug,
  isEmbed,
  paymentStatus,
}: {
  slug: string;
  isEmbed: boolean;
  paymentStatus: string | null;
}) {
  const [hotelName, setHotelName] = useState<string | null>(null);
  const [hotelNotFound, setHotelNotFound] = useState(false);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [rooms, setRooms] = useState<AvailableRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState<DocumentType | "">("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/public/${slug}/info`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setHotelNotFound(true);
          return;
        }
        setHotelName(data.nombre);
      })
      .catch(() => {
        if (!cancelled) setHotelNotFound(true);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    return nightsBetween(new Date(checkIn), new Date(checkOut));
  }, [checkIn, checkOut]);

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null;
  const total = selectedRoom ? selectedRoom.precio * nights : 0;

  async function handleBuscarDisponibilidad() {
    setRoomsError(null);

    if (!checkIn || !checkOut) {
      setRoomsError("Selecciona ambas fechas.");
      return;
    }
    if (checkOut <= checkIn) {
      setRoomsError("El check-out debe ser posterior al check-in.");
      return;
    }

    setIsLoadingRooms(true);
    try {
      const response = await fetch(
        `/api/public/${slug}/disponibilidad?checkIn=${checkIn}&checkOut=${checkOut}`
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ?? "No se pudo consultar la disponibilidad."
        );
      }

      setRooms(data as AvailableRoom[]);
      setSelectedRoomId(null);
      setStep(2);
    } catch (err) {
      setRoomsError(
        err instanceof Error
          ? err.message
          : "No se pudo consultar la disponibilidad."
      );
    } finally {
      setIsLoadingRooms(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (!selectedRoomId) return;

    if (
      !nombre.trim() ||
      !apellido.trim() ||
      !email.trim() ||
      !telefono.trim() ||
      !tipoDocumento ||
      !numeroDocumento.trim()
    ) {
      setSubmitError("Completa todos los campos.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/public/${slug}/reservar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkIn,
          checkOut,
          roomId: selectedRoomId,
          nombre,
          apellido,
          email,
          telefono,
          tipoDocumento,
          numeroDocumento,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo completar la reserva.");
      }

      window.location.href = data.initPoint;
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "No se pudo completar la reserva."
      );
      setIsSubmitting(false);
    }
  }

  if (hotelNotFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-[#f0ede8] px-4 text-center">
        <p className="text-lg font-semibold text-[#111]">
          No encontramos este hotel.
        </p>
        <p className="text-sm text-muted-foreground">
          Verifica el enlace e intenta nuevamente.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f0ede8]">
      {!isEmbed && <BookingHeader hotelName={hotelName ?? "Protel"} />}

      <div className="flex items-center justify-center gap-2 border-b border-black/5 bg-white px-4 py-4 text-sm sm:gap-4">
        {STEPS.map((s, index) => (
          <div key={s.id} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                step === s.id
                  ? "bg-[#111] text-white"
                  : step > s.id
                    ? "bg-neutral-800/80 text-white"
                    : "bg-neutral-200 text-neutral-500"
              )}
            >
              {s.id}
            </span>
            <span
              className={cn(
                "hidden sm:inline",
                step === s.id
                  ? "font-semibold text-[#111]"
                  : "text-muted-foreground"
              )}
            >
              {s.label}
            </span>
            {index < STEPS.length - 1 && (
              <span className="mx-1 h-px w-6 bg-neutral-300 sm:w-10" />
            )}
          </div>
        ))}
      </div>

      {paymentStatus === "fallido" && (
        <div className="mx-auto mt-4 w-full max-w-3xl rounded-lg bg-red-100 px-4 py-3 text-sm text-red-800">
          El pago no se pudo completar. Podés intentarlo nuevamente.
        </div>
      )}
      {paymentStatus === "pendiente" && (
        <div className="mx-auto mt-4 w-full max-w-3xl rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-800">
          Tu pago está pendiente de confirmación.
        </div>
      )}

      {step === 1 && (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-8">
          <h1 className="text-2xl font-bold text-[#111] sm:text-3xl">
            ¿Cuándo querés venir?
          </h1>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="checkIn">Check-in</Label>
              <Input
                id="checkIn"
                type="date"
                min={todayStr()}
                value={checkIn}
                onChange={(event) => setCheckIn(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="checkOut">Check-out</Label>
              <Input
                id="checkOut"
                type="date"
                min={checkIn || todayStr()}
                value={checkOut}
                onChange={(event) => setCheckOut(event.target.value)}
              />
            </div>
          </div>

          {roomsError ? (
            <p className="text-sm text-red-600">{roomsError}</p>
          ) : null}

          <Button
            onClick={handleBuscarDisponibilidad}
            disabled={isLoadingRooms}
            className="w-fit font-bold text-white hover:opacity-90"
            style={{ backgroundColor: BLUE }}
          >
            {isLoadingRooms ? "Buscando…" : "Ver habitaciones disponibles"}
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-8">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-fit text-sm text-muted-foreground underline underline-offset-2"
          >
            ← Cambiar fechas
          </button>
          <h1 className="text-xl font-bold text-[#111] sm:text-2xl">
            {rooms.length} habitaciones disponibles · {nights} noches
          </h1>

          {rooms.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay habitaciones disponibles para esas fechas.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => {
                const isSelected = selectedRoomId === room.id;
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setSelectedRoomId(room.id)}
                    className={cn(
                      "relative flex flex-col overflow-hidden rounded-xl border bg-white text-left transition",
                      isSelected
                        ? "border-2 border-[#111]"
                        : "border-neutral-200 hover:border-neutral-300"
                    )}
                  >
                    {isSelected ? (
                      <span className="absolute top-2 right-2 rounded-full bg-[#111] px-2 py-0.5 text-xs font-semibold text-white">
                        Seleccionada
                      </span>
                    ) : null}
                    <div className="h-32 w-full bg-neutral-200" />
                    <div className="flex flex-col gap-1 p-4">
                      <span className="font-semibold text-[#111]">
                        {room.tipo}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Capacidad: {room.capacidad} personas
                      </span>
                      <span className="mt-1 font-bold text-[#111]">
                        {formatCurrency(room.precio)} / noche
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <Button
            onClick={() => setStep(3)}
            disabled={!selectedRoomId}
            className="w-fit font-bold text-white hover:opacity-90"
            style={{ backgroundColor: BLUE }}
          >
            Continuar
          </Button>
        </div>
      )}

      {step === 3 && selectedRoom && (
        <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-fit text-sm text-muted-foreground underline underline-offset-2"
            >
              ← Cambiar habitación
            </button>
            <h1 className="text-xl font-bold text-[#111] sm:text-2xl">
              Tus datos
            </h1>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    required
                    value={nombre}
                    onChange={(event) => setNombre(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="apellido">Apellido</Label>
                  <Input
                    id="apellido"
                    required
                    value={apellido}
                    onChange={(event) => setApellido(event.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    type="tel"
                    required
                    value={telefono}
                    onChange={(event) => setTelefono(event.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tipoDocumento">Tipo de documento</Label>
                  <Select
                    value={tipoDocumento}
                    onValueChange={(value) =>
                      setTipoDocumento(value as DocumentType)
                    }
                  >
                    <SelectTrigger id="tipoDocumento" className="w-full">
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {formatDocumentType(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="numeroDocumento">Número de documento</Label>
                  <Input
                    id="numeroDocumento"
                    required
                    value={numeroDocumento}
                    onChange={(event) => setNumeroDocumento(event.target.value)}
                  />
                </div>
              </div>

              {submitError ? (
                <p role="alert" className="text-sm text-red-600">
                  {submitError}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-fit font-bold text-white hover:opacity-90"
                style={{ backgroundColor: BLUE }}
              >
                {isSubmitting ? "Redirigiendo…" : "Pagar con MercadoPago"}
              </Button>
            </form>
          </div>

          <aside className="h-fit rounded-xl border border-black/10 bg-white p-5">
            <h2 className="font-semibold text-[#111]">Resumen</h2>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Habitación</span>
                <span className="font-medium text-[#111]">
                  {selectedRoom.tipo} · {selectedRoom.numero}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-in</span>
                <span className="font-medium text-[#111]">{checkIn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-out</span>
                <span className="font-medium text-[#111]">{checkOut}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Noches</span>
                <span className="font-medium text-[#111]">{nights}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Precio / noche</span>
                <span className="font-medium text-[#111]">
                  {formatCurrency(selectedRoom.precio)}
                </span>
              </div>
              <div className="mt-2 flex justify-between border-t border-black/10 pt-2 text-base">
                <span className="font-semibold text-[#111]">Total</span>
                <span className="font-bold text-[#111]">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
