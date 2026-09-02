"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Printer, Search, TriangleAlert } from "lucide-react";
import type { HousekeepingTask, Reservation, Room } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRoomStatus, roomStatusBadgeClassName } from "@/lib/room-status";
import { parseExtras } from "@/lib/reservation-extras";
import { useRouter } from "next/navigation";

type RoomWithDaily = Room & {
  housekeepingTask: HousekeepingTask | null;
  activeReservation: Reservation | null;
};

type UserMinimal = { id: string; name: string };

function hasExtraTowels(reservation: Reservation | null): boolean {
  if (!reservation) return false;
  return parseExtras(reservation.extras).some((extra) =>
    extra.nombre.toLowerCase().includes("toalla")
  );
}

export function DailyCleaning({
  initialRooms,
  mucamas,
  isSuperAdmin,
}: {
  initialRooms: RoomWithDaily[];
  mucamas: UserMinimal[];
  isSuperAdmin?: boolean;
}) {
  const router = useRouter();
  const [rooms, setRooms] = useState(initialRooms);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedMucama, setSelectedMucama] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);

  // BUG ARREGLADO: Ahora filtramos sobre "rooms" (estado dinámico) y no sobre "initialRooms" (estado fijo).
  const filteredRooms = useMemo(() => {
    const query = search.trim();
    if (!query) return rooms; 
    return rooms.filter((room) => room.number.includes(query));
  }, [rooms, search]); 

  const allCleaned = rooms.length > 0 && rooms.every((room) => room.housekeepingTask?.limpiadaHoy === true);
  const allSelected = filteredRooms.length > 0 && selectedIds.size === filteredRooms.length;
  const indeterminate = selectedIds.size > 0 && selectedIds.size < filteredRooms.length;

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredRooms.map((r) => r.id)));
  }

  function toggleRow(roomId: string) {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(roomId)) newSelected.delete(roomId);
    else newSelected.add(roomId);
    setSelectedIds(newSelected);
  }

  async function handleBulkAssign() {
    if (!selectedMucama || selectedIds.size === 0) return;
    setIsAssigning(true);
    try {
      const response = await fetch("/api/housekeeping/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomIds: Array.from(selectedIds),
          assignedToId: selectedMucama,
        }),
      });
      if (!response.ok) throw new Error("Error en la asignación");
      
      // Sincronización instantánea en pantalla
      setRooms((prev) => prev.map((room) => 
        selectedIds.has(room.id) 
          ? { ...room, housekeepingTask: { ...room.housekeepingTask, assignedToId: selectedMucama } as HousekeepingTask }
          : room
      ));
      
      setSelectedIds(new Set());
      setSelectedMucama("");
      router.refresh(); 
    } catch {
      alert("Hubo un error al asignar las tareas.");
    } finally {
      setIsAssigning(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {selectedIds.size > 0 && !isSuperAdmin && (
        <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-lg border border-border print:hidden">
          <span className="text-sm font-medium">{selectedIds.size} seleccionadas</span>
          <div className="h-4 w-px bg-border mx-2" />
          <Select value={selectedMucama} onValueChange={(value) => setSelectedMucama(value ?? "")}>
            <SelectTrigger className="w-[200px] bg-background">
              <SelectValue placeholder="Asignar a..." />
            </SelectTrigger>
            <SelectContent>
              {mucamas.map((mucama) => (
                <SelectItem key={mucama.id} value={mucama.id}>{mucama.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleBulkAssign} disabled={!selectedMucama || isAssigning}>
            {isAssigning ? "Asignando..." : "Confirmar asignación"}
          </Button>
          <Button variant="ghost" onClick={() => setSelectedIds(new Set())}>Cancelar</Button>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Limpieza del día</CardTitle>
          <div className="flex items-center gap-2 print:hidden">
            <div className="relative w-48">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar N°…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="size-4 mr-2" />
              Imprimir planilla
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {allCleaned && (
            <div className="flex items-center gap-2 rounded-md border border-green-600/30 bg-green-100 px-3 py-2 text-sm text-green-800 print:hidden">
              <CheckCircle2 className="size-4" />
              Todas las habitaciones fueron marcadas como limpiadas hoy.
            </div>
          )}

          <div className="overflow-x-auto">
            <Table className="print:hidden">
              <TableHeader>
                <TableRow>
                  {!isSuperAdmin && (
                    <TableHead className="w-12 text-center">
                      <Checkbox
                        checked={allSelected}
                        indeterminate={indeterminate}
                        onCheckedChange={toggleAll}
                        aria-label="Seleccionar todas"
                      />
                    </TableHead>
                  )}
                  <TableHead>N° Hab.</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Asignada a</TableHead>
                  <TableHead>Limpieza</TableHead>
                  <TableHead>Motivo / Alertas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRooms.map((room) => {
                  const cleaned = room.housekeepingTask?.limpiadaHoy === true;
                  const isSelected = selectedIds.has(room.id);
                  const assignedUser = mucamas.find((m) => m.id === room.housekeepingTask?.assignedToId);

                  return (
                    <TableRow key={room.id} data-state={isSelected ? "selected" : undefined}>
                      {!isSuperAdmin && (
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleRow(room.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{room.number}</TableCell>
                      <TableCell>
                        <Badge className={roomStatusBadgeClassName(room.status)}>
                          {formatRoomStatus(room.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {assignedUser ? assignedUser.name : "Sin asignar"}
                      </TableCell>
                      <TableCell>
                         {cleaned ? (
                           <Badge variant="outline" className="border-green-600/30 bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400">
                             Limpia
                           </Badge>
                         ) : (
                           <Badge variant="outline" className="border-red-600/30 bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400">
                             Por limpiar
                           </Badge>
                         )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex flex-col gap-1 items-start">
                          <span>{room.housekeepingTask?.notes || "—"}</span>
                          {hasExtraTowels(room.activeReservation) && (
                            <Badge variant="secondary" className="w-fit gap-1 text-amber-700">
                              <TriangleAlert className="size-3" /> Toallas extra
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}