"use client";
import { useState, useEffect } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/format-currency";
import {
  ROOM_STATUSES,
  formatRoomStatus,
  roomStatusBadgeClassName,
} from "@/lib/room-status";

export function RoomCard({
  room: initialRoom,
  onDeleted,
}: {
  room: Room;
  onDeleted: (roomId: string) => void;
}) {
  const [room, setRoom] = useState(initialRoom);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<RoomStatus>(room.status);
  const [notes, setNotes] = useState(room.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  useEffect(() => {
    setRoom(initialRoom);
    if (!open) {
      setStatus(initialRoom.status);
      setNotes(initialRoom.notes ?? "");
    }
  }, [initialRoom, open]);



  const isMaintenance = room.status === "MANTENIMIENTO";
  const canDelete = room.status === "AVAILABLE";

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setStatus(room.status);
      setNotes(room.notes ?? "");
      setError(null);
      setConfirmDelete(false);
      setDeleteError(null);
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

  async function handleDelete() {
    setDeleteError(null);
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/rooms/${room.id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo eliminar la habitación.");
      }

      onDeleted(room.id);
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar la habitación. Inténtalo de nuevo."
      );
      setIsDeleting(false);
    }
  }

  return (
    <Card className={isMaintenance ? "ring-1 ring-red-500/60" : undefined}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1 w-full overflow-hidden">
            <CardTitle className="flex items-center gap-1.5 text-xl">
              Hab. {room.number}
              {isMaintenance ? (
                <AlertTriangle
                  className="size-4 text-red-600 dark:text-red-400 shrink-0"
                  aria-label="En mantenimiento"
                />
              ) : null}
            </CardTitle>
            <CardDescription className="truncate">
              Piso {room.floor} · {room.type} · {room.capacity}{" "}
              {room.capacity === 1 ? "persona" : "personas"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {room.notes ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      tabIndex={0}
                      className="inline-flex size-2 shrink-0 rounded-full bg-amber-500 dark:bg-amber-400"
                    />
                  }
                >
                  <span className="sr-only">Esta habitación tiene una nota</span>
                </TooltipTrigger>
                <TooltipContent>{room.notes}</TooltipContent>
              </Tooltip>
            ) : null}
            <Badge className={roomStatusBadgeClassName(room.status)}>
              {formatRoomStatus(room.status)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-medium truncate" title={formatCurrency(room.pricePerNight)}>
          {formatCurrency(room.pricePerNight)}{" "}
          <span className="font-normal text-muted-foreground">/ noche</span>
        </p>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button variant="outline" size="sm" className="w-full" />}>
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
              {deleteError ? (
                <p role="alert" className="text-sm text-destructive">
                  {deleteError}
                </p>
              ) : null}
            </div>

            <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-4 mt-4">
              {canDelete ? (
                confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-destructive font-medium">¿Seguro?</span>
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="sm" 
                      onClick={handleDelete} 
                      disabled={isDeleting}
                    >
                      {isDeleting ? "..." : "Sí, eliminar"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setConfirmDelete(false)} 
                      disabled={isDeleting}
                    >
                      No
                    </Button>
                  </div>
                ) : (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive px-2"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="size-4 mr-2" /> Eliminar
                  </Button>
                )
              ) : (
                <div />
              )}
              
              <div className="flex gap-2 w-full sm:w-auto justify-end">
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
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}