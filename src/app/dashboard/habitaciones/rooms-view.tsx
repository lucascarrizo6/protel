"use client";
import { useMemo, useState, useEffect, type FormEvent } from "react";
import { Search } from "lucide-react";
import type { Room } from "@/generated/prisma/client";
import type { RoomStatus } from "@/generated/prisma/enums";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoomCard } from "./room-card";
import { ROOM_STATUSES, formatRoomStatus } from "@/lib/room-status";

const ROOM_TYPES = [
  "Simple",
  "Doble",
  "Twin (dos camas)",
  "Triple",
  "Cuádruple",
  "Suite",
  "Suite Junior",
  "Departamento",
] as const;

export function RoomsView({ initialRooms }: { initialRooms: Room[] }) {
  const [rooms, setRooms] = useState(initialRooms);
  
  // Sincronización automática con el servidor (Smart Polling)
  useEffect(() => {
    setRooms(initialRooms);
  }, [initialRooms]);
  console.log("💻 CLIENTE: Recibiendo", initialRooms.map(r => `${r.number}:${r.status}`));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState("");
  const [floor, setFloor] = useState("");
  const [type, setType] = useState("");
  const [capacity, setCapacity] = useState("2");
  const [pricePerNight, setPricePerNight] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredRooms = useMemo(() => {
    let result = rooms;
    
    if (statusFilter !== "ALL") {
      result = result.filter((room) => room.status === statusFilter);
    }
    
    const query = search.trim();
    if (query) {
      result = result.filter((room) => room.number.includes(query));
    }
    
    return result;
  }, [rooms, search, statusFilter]);

  const groupedRooms = useMemo(() => {
    const groups: Record<number, Room[]> = {};
    for (const room of filteredRooms) {
      if (!groups[room.floor]) {
        groups[room.floor] = [];
      }
      groups[room.floor].push(room);
    }
    
    return Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b));
  }, [filteredRooms]);

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

    if (!type) {
      setError("Selecciona un tipo de habitación.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number,
          type,
          floor: Number(floor),
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-full max-w-lg gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por número…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-8"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? "")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Estado">
                {(value: string | null) =>
                  !value || value === "ALL"
                    ? "Todos los estados"
                    : formatRoomStatus(value as RoomStatus)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los estados</SelectItem>
              {ROOM_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {formatRoomStatus(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                      step="1"
                      placeholder="Ej: 3, 0 o -1"
                      required
                      value={floor}
                      onChange={(event) => setFloor(event.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="type">Tipo</Label>
                  <Select
                    value={type}
                    onValueChange={(value) => setType(value ?? "")}
                  >
                    <SelectTrigger id="type" className="w-full">
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map((roomType) => (
                        <SelectItem key={roomType} value={roomType}>
                          {roomType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
      ) : groupedRooms.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin resultados</CardTitle>
            <CardDescription>
              No hay habitaciones que coincidan con los filtros aplicados.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="flex flex-col gap-8">
          {groupedRooms.map(([floorLevel, floorRooms]) => (
            <div key={floorLevel} className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold tracking-tight border-b pb-2">
                Piso {floorLevel}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {floorRooms.map((room) => (
                  <RoomCard key={room.id} room={room} onDeleted={handleDeleted} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}