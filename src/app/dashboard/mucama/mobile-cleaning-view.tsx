"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, TriangleAlert, Info } from "lucide-react";
import type { HousekeepingTask, Reservation, Room } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRoomStatus, roomStatusBadgeClassName } from "@/lib/room-status";
import { parseExtras } from "@/lib/reservation-extras";

type RoomWithDaily = Room & {
  housekeepingTask: HousekeepingTask | null;
  activeReservation: Reservation | null;
};

export function MobileCleaningView({
  initialRooms,
  currentUserId,
}: {
  initialRooms: RoomWithDaily[];
  currentUserId?: string;
}) {
  const [rooms, setRooms] = useState(initialRooms);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const activeRooms = useMemo(() => {
    return rooms.filter((room) => room.housekeepingTask?.limpiadaHoy !== true);
  }, [rooms]);

  const groupedRooms = useMemo(() => {
    const groups: Record<number, RoomWithDaily[]> = {};
    for (const room of activeRooms) {
      if (!groups[room.floor]) groups[room.floor] = [];
      groups[room.floor].push(room);
    }
    return Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b));
  }, [activeRooms]);

  async function updateStatus(roomId: string) {
    setUpdatingId(roomId);
    try {
      const response = await fetch(`/api/rooms/${roomId}/housekeeping-task`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limpiadaHoy: true, status: "COMPLETADA" }),
      });
      if (!response.ok) throw new Error("Error al actualizar");
      const task = await response.json();
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, housekeepingTask: task } : r))
      );
    } catch {
      alert("Error de conexión.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function updateNote(roomId: string, noteValue: string) {
    try {
      await fetch(`/api/rooms/${roomId}/housekeeping-task`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: noteValue }),
      });
    } catch {
      // Falla silenciosa si no hay internet al tipear
    }
  }

  if (groupedRooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 className="size-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold tracking-tight">¡Turno completado!</h2>
        <p className="text-muted-foreground mt-2">
          No hay habitaciones pendientes de limpieza.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      {groupedRooms.map(([floorLevel, floorRooms]) => (
        <div key={floorLevel} className="flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b pb-2">
            <h3 className="text-xl font-bold tracking-tight">Piso {floorLevel}</h3>
            <Badge variant="secondary" className="rounded-full">{floorRooms.length}</Badge>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {floorRooms.map((room) => {
              const task = room.housekeepingTask;
              const hasTowels = room.activeReservation 
                ? parseExtras(room.activeReservation.extras).some(e => e.nombre.toLowerCase().includes("toalla"))
                : false;
              const isMine = task?.assignedToId === currentUserId;
              const currentNote = notes[room.id] ?? task?.notes ?? "";

              return (
                <Card key={room.id} className={`flex flex-col ${isMine ? "border-blue-500 shadow-sm" : ""}`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-3xl font-bold">Hab. {room.number}</CardTitle>
                      <Badge className={roomStatusBadgeClassName(room.status)}>
                        {formatRoomStatus(room.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4 flex-grow flex flex-col gap-3">
                    {isMine && (
                      <Badge className="w-fit bg-blue-100 text-blue-800 hover:bg-blue-100">Asignada a ti</Badge>
                    )}
                    {hasTowels && (
                      <div className="flex gap-2 p-3 bg-red-50 text-red-900 rounded-md text-sm border border-red-200">
                        <TriangleAlert className="size-4 shrink-0 mt-0.5" />
                        <p className="font-semibold">Dejar toallas extra</p>
                      </div>
                    )}
                    
                    {/* Input de Motivo para la Mucama */}
                    <div className="mt-2 flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Motivo / Observaciones
                      </label>
                      <Input
                        className="h-9 bg-muted/50"
                        placeholder="Ej: No quiso limpieza..."
                        value={currentNote}
                        onChange={(e) => setNotes(prev => ({ ...prev, [room.id]: e.target.value }))}
                        onBlur={(e) => updateNote(room.id, e.target.value)}
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full h-14 text-lg" 
                      onClick={() => updateStatus(room.id)}
                      disabled={updatingId === room.id}
                    >
                      <CheckCircle2 className="mr-2 size-6" />
                      {updatingId === room.id ? "Marcando..." : "Marcar Limpia"}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}