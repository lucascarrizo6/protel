"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Printer, Search, TriangleAlert } from "lucide-react";
import type { HousekeepingTask, Reservation, Room } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRoomStatus, roomStatusBadgeClassName } from "@/lib/room-status";
import { parseExtras } from "@/lib/reservation-extras";

type RoomWithDaily = Room & {
  housekeepingTask: HousekeepingTask | null;
  activeReservation: Reservation | null;
};

function hasExtraTowels(reservation: Reservation | null): boolean {
  if (!reservation) return false;
  return parseExtras(reservation.extras).some((extra) =>
    extra.nombre.toLowerCase().includes("toalla")
  );
}

export function DailyCleaning({
  initialRooms,
}: {
  initialRooms: RoomWithDaily[];
}) {
  const [rooms, setRooms] = useState(initialRooms);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>(
    {}
  );
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});

  const filteredRooms = useMemo(() => {
    const query = search.trim();
    if (!query) return rooms;
    return rooms.filter((room) => room.number.includes(query));
  }, [rooms, search]);

  const allCleaned =
    rooms.length > 0 &&
    rooms.every((room) => room.housekeepingTask?.status === "COMPLETADA");

  function applyUpdate(roomId: string, task: HousekeepingTask) {
    setRooms((prev) =>
      prev.map((room) =>
        room.id === roomId ? { ...room, housekeepingTask: task } : room
      )
    );
  }

  async function saveTask(
    roomId: string,
    body: { status?: string; reason?: string | null; notes?: string | null }
  ) {
    setSavingId(roomId);
    try {
      const response = await fetch(`/api/rooms/${roomId}/housekeeping-task`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Request failed");
      const task = (await response.json()) as HousekeepingTask;
      applyUpdate(roomId, task);
    } catch {
      // silently ignore; the UI simply won't reflect the change
    } finally {
      setSavingId(null);
    }
  }

  function handleToggleCleaned(room: RoomWithDaily, checked: boolean) {
    saveTask(room.id, {
      status: checked ? "COMPLETADA" : "PENDIENTE",
      reason: checked ? null : (room.housekeepingTask?.reason ?? null),
    });
  }

  function handleReasonBlur(roomId: string) {
    const reason = reasonDrafts[roomId];
    if (reason === undefined) return;
    saveTask(roomId, { reason });
  }

  function handleNotesBlur(roomId: string) {
    const notes = notesDrafts[roomId];
    if (notes === undefined) return;
    saveTask(roomId, { notes });
  }

  function handlePrint() {
    window.print();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>Limpieza del día</CardTitle>
        <div className="flex items-center gap-2 print:hidden">
          <div className="relative w-48">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar N°…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-8 pl-8"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="size-4" />
            Imprimir planilla
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {allCleaned ? (
          <div className="flex items-center gap-2 rounded-md border border-green-600/30 bg-green-100 px-3 py-2 text-sm text-green-800 print:hidden dark:bg-green-500/15 dark:text-green-400">
            <CheckCircle2 className="size-4" />
            Todas las habitaciones fueron marcadas como limpiadas hoy.
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <Table className="print:hidden">
            <TableHeader>
              <TableRow>
                <TableHead>N° Hab.</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Huésped</TableHead>
                <TableHead>Notas especiales</TableHead>
                <TableHead>Limpiada</TableHead>
                <TableHead>Motivo (si no se limpió)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRooms.map((room) => {
                const cleaned = room.housekeepingTask?.status === "COMPLETADA";
                const reasonValue =
                  reasonDrafts[room.id] ?? room.housekeepingTask?.reason ?? "";
                return (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">
                      {room.number}
                    </TableCell>
                    <TableCell>
                      <Badge className={roomStatusBadgeClassName(room.status)}>
                        {formatRoomStatus(room.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {room.activeReservation ? (
                        <div className="flex flex-col gap-1">
                          <span>{room.activeReservation.guestName}</span>
                          {hasExtraTowels(room.activeReservation) ? (
                            <Badge
                              variant="secondary"
                              className="w-fit gap-1 text-amber-700 dark:text-amber-400"
                            >
                              <TriangleAlert className="size-3" />
                              Dejar toallas extra
                            </Badge>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 min-w-48"
                        placeholder="Notas de limpieza…"
                        value={
                          notesDrafts[room.id] ??
                          room.housekeepingTask?.notes ??
                          ""
                        }
                        onChange={(event) =>
                          setNotesDrafts((prev) => ({
                            ...prev,
                            [room.id]: event.target.value,
                          }))
                        }
                        onBlur={() => handleNotesBlur(room.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={cleaned}
                        disabled={savingId === room.id}
                        onCheckedChange={(checked) =>
                          handleToggleCleaned(room, checked === true)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {cleaned ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <Input
                          className="h-8 min-w-48"
                          placeholder="No quiso limpieza, Do not disturb, En mantenimiento…"
                          value={reasonValue}
                          onChange={(event) =>
                            setReasonDrafts((prev) => ({
                              ...prev,
                              [room.id]: event.target.value,
                            }))
                          }
                          onBlur={() => handleReasonBlur(room.id)}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="hidden print:block">
          <h2 className="mb-4 text-lg font-semibold">
            Planilla de limpieza diaria
          </h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-black p-2 text-left">
                  N° habitación
                </th>
                <th className="border border-black p-2 text-left">Huésped</th>
                <th className="border border-black p-2 text-left">
                  Notas especiales
                </th>
                <th className="border border-black p-2 text-center">
                  Limpiada
                </th>
                <th className="border border-black p-2 text-left">Firma</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td className="border border-black p-2">{room.number}</td>
                  <td className="border border-black p-2">
                    {room.activeReservation?.guestName ?? "—"}
                  </td>
                  <td className="border border-black p-2">
                    {room.housekeepingTask?.notes ?? ""}
                    {hasExtraTowels(room.activeReservation)
                      ? " · Dejar toallas extra"
                      : ""}
                  </td>
                  <td className="border border-black p-2 text-center">☐</td>
                  <td className="border border-black p-2"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
