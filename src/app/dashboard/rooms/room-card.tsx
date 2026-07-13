"use client";

import { useState } from "react";
import type { Room } from "@/generated/prisma/client";
import type { RoomStatus } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ROOM_STATUSES,
  formatRoomStatus,
  roomStatusBadgeClassName,
} from "@/lib/room-status";

export function RoomCard({ room: initialRoom }: { room: Room }) {
  const [room, setRoom] = useState(initialRoom);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<RoomStatus>(room.status);
  const [notes, setNotes] = useState(room.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setStatus(room.status);
      setNotes(room.notes ?? "");
      setError(null);
    }
  }

  async function handleSave() {
    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/rooms/${room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const updatedRoom = (await response.json()) as Room;
      setRoom(updatedRoom);
      setOpen(false);
    } catch {
      setError("No se pudieron guardar los cambios. Inténtalo de nuevo.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-xl">Habitación {room.number}</CardTitle>
            <CardDescription>
              Piso {room.floor} · {room.type}
            </CardDescription>
          </div>
          <Badge className={roomStatusBadgeClassName(room.status)}>
            {formatRoomStatus(room.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="min-h-10 text-sm text-muted-foreground">
          {room.notes || "Sin notas."}
        </p>
      </CardContent>
      <CardFooter>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button variant="outline" size="sm" />}>
            Editar estado y notas
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Habitación {room.number}</DialogTitle>
              <DialogDescription>
                Actualiza el estado y las notas de esta habitación.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`status-${room.id}`}>Estado</Label>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as RoomStatus)}
                >
                  <SelectTrigger id={`status-${room.id}`} className="w-full">
                    <SelectValue>
                      {(value: RoomStatus | null) =>
                        value ? formatRoomStatus(value) : "Selecciona un estado"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_STATUSES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {formatRoomStatus(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`notes-${room.id}`}>Notas</Label>
                <Textarea
                  id={`notes-${room.id}`}
                  placeholder="Agrega una nota sobre esta habitación…"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>

              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Guardando…" : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
