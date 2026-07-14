"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import type { Room } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { RoomCard } from "./room-card";

export function RoomsView({ initialRooms }: { initialRooms: Room[] }) {
  const [rooms, setRooms] = useState(initialRooms);
  const [search, setSearch] = useState("");

  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState("");
  const [floor, setFloor] = useState("");
  const [type, setType] = useState("");
  const [capacity, setCapacity] = useState("2");
  const [pricePerNight, setPricePerNight] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredRooms = useMemo(() => {
    const query = search.trim();
    if (!query) return rooms;
    return rooms.filter((room) => room.number.includes(query));
  }, [rooms, search]);

  function resetForm() {
    setNumber("");
    setFloor("");
    setType("");
    setCapacity("2");
    setPricePerNight("");
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      resetForm();
    }
  }

  function handleDeleted(roomId: string) {
    setRooms((prev) => prev.filter((room) => room.id !== roomId));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number,
          floor: Number(floor),
          type,
          capacity: Number(capacity),
          pricePerNight: Number(pricePerNight),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo crear la habitación.");
      }

      setRooms((prev) =>
        [...prev, data as Room].sort(
          (a, b) => a.floor - b.floor || a.number.localeCompare(b.number)
        )
      );
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear la habitación. Inténtalo de nuevo."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por número…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-8"
          />
        </div>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button size="sm" />}>
            Agregar habitación
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit} className="contents">
              <DialogHeader>
                <DialogTitle>Agregar habitación</DialogTitle>
                <DialogDescription>
                  Completa los datos de la nueva habitación.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="number">Número</Label>
                    <Input
                      id="number"
                      required
                      value={number}
                      onChange={(event) => setNumber(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="floor">Piso</Label>
                    <Input
                      id="floor"
                      type="number"
                      required
                      value={floor}
                      onChange={(event) => setFloor(event.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="type">Tipo</Label>
                  <Input
                    id="type"
                    placeholder="Individual, Doble, Suite…"
                    required
                    value={type}
                    onChange={(event) => setType(event.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="capacity">Capacidad</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min="1"
                      required
                      value={capacity}
                      onChange={(event) => setCapacity(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="pricePerNight">Precio / noche (ARS)</Label>
                    <Input
                      id="pricePerNight"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={pricePerNight}
                      onChange={(event) => setPricePerNight(event.target.value)}
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
                  {isSaving ? "Creando…" : "Crear habitación"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {rooms.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aún no hay habitaciones</CardTitle>
            <CardDescription>
              Las habitaciones de tu hotel aparecerán aquí una vez que se
              agreguen.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : filteredRooms.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin resultados</CardTitle>
            <CardDescription>
              No hay habitaciones que coincidan con &quot;{search}&quot;.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredRooms.map((room) => (
            <RoomCard key={room.id} room={room} onDeleted={handleDeleted} />
          ))}
        </div>
      )}
    </div>
  );
}
