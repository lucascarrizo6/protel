"use client";

import { useState } from "react";
import type { HousekeepingTask, Room } from "@/generated/prisma/client";
import type { HousekeepingStatus } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { roomStatusBadgeClassName, formatRoomStatus } from "@/lib/room-status";
import {
  HOUSEKEEPING_STATUSES,
  formatHousekeepingStatus,
} from "@/lib/housekeeping-status";

type RoomWithTask = Room & { housekeepingTask: HousekeepingTask | null };

export function HousekeepingRoomCard({ room }: { room: RoomWithTask }) {
  const [status, setStatus] = useState<HousekeepingStatus>(
    room.housekeepingTask?.status ?? "PENDIENTE"
  );
  const [priority, setPriority] = useState(room.housekeepingTask?.priority ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateTask(nextStatus: HousekeepingStatus, nextPriority: boolean) {
    const previousStatus = status;
    const previousPriority = priority;

    setStatus(nextStatus);
    setPriority(nextPriority);
    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/rooms/${room.id}/housekeeping-task`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, priority: nextPriority }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const updated = (await response.json()) as HousekeepingTask;
      setStatus(updated.status);
      setPriority(updated.priority);
    } catch {
      setStatus(previousStatus);
      setPriority(previousPriority);
      setError("No se pudo guardar. Inténtalo de nuevo.");
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
          <div className="flex flex-col items-end gap-1.5">
            <Badge className={roomStatusBadgeClassName(room.status)}>
              {formatRoomStatus(room.status)}
            </Badge>
            {priority ? (
              <Badge variant="destructive">Prioritaria</Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`task-status-${room.id}`}>Tarea de limpieza</Label>
          <Select
            value={status}
            onValueChange={(value) =>
              updateTask(value as HousekeepingStatus, priority)
            }
            disabled={isSaving}
          >
            <SelectTrigger id={`task-status-${room.id}`} className="w-full">
              <SelectValue>
                {(value: HousekeepingStatus | null) =>
                  value ? formatHousekeepingStatus(value) : "Selecciona un estado"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {HOUSEKEEPING_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {formatHousekeepingStatus(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={priority}
            onCheckedChange={(checked) => updateTask(status, checked === true)}
            disabled={isSaving}
          />
          Marcar como prioritaria
        </label>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
