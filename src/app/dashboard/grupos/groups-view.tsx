"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import type {
  Group,
  GroupMember,
  Reservation,
  Room,
} from "@/generated/prisma/client";
import type { BedArrangement } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { formatDate } from "@/lib/format-date";
import {
  BED_ARRANGEMENTS,
  formatBedArrangement,
} from "@/lib/bed-arrangement";

type GroupWithMembers = Group & {
  members: (GroupMember & {
    room: Room | null;
    reservation: Reservation | null;
  })[];
};

type ReservationSlim = { roomId: string; checkIn: Date; checkOut: Date };

type DraftMember = {
  nombre: string;
  dni: string;
  roomId: string;
  esFree: boolean;
};

function checkedInCount(group: GroupWithMembers): number {
  return group.members.filter(
    (member) =>
      member.reservation?.status === "CONFIRMADA" ||
      member.reservation?.status === "COMPLETADA"
  ).length;
}

export function GroupsView({
  initialGroups,
  rooms,
  existingReservations,
}: {
  initialGroups: GroupWithMembers[];
  rooms: Room[];
  existingReservations: ReservationSlim[];
}) {
  const [groups, setGroups] = useState(initialGroups);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [nombre, setNombre] = useState("");
  const [fechaEntrada, setFechaEntrada] = useState("");
  const [fechaSalida, setFechaSalida] = useState("");
  const [cantidadPersonas, setCantidadPersonas] = useState("2");
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [roomArrangements, setRoomArrangements] = useState<
    Record<string, BedArrangement>
  >({});
  const [members, setMembers] = useState<DraftMember[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableRooms = useMemo(() => {
    if (!fechaEntrada || !fechaSalida) return [];
    const start = new Date(fechaEntrada);
    const end = new Date(fechaSalida);
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      return [];
    }
    const busyRoomIds = new Set(
      existingReservations
        .filter(
          (reservation) =>
            new Date(reservation.checkIn) < end &&
            new Date(reservation.checkOut) > start
        )
        .map((reservation) => reservation.roomId)
    );
    return rooms.filter((room) => !busyRoomIds.has(room.id));
  }, [rooms, existingReservations, fechaEntrada, fechaSalida]);

  const roomsByFloor = useMemo(() => {
    const map = new Map<number, Room[]>();
    for (const room of availableRooms) {
      const list = map.get(room.floor) ?? [];
      list.push(room);
      map.set(room.floor, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [availableRooms]);

  const selectedRooms = availableRooms.filter((room) =>
    selectedRoomIds.includes(room.id)
  );

  function resetWizard() {
    setStep(1);
    setNombre("");
    setFechaEntrada("");
    setFechaSalida("");
    setCantidadPersonas("2");
    setSelectedRoomIds([]);
    setRoomArrangements({});
    setMembers([]);
    setError(null);
  }

  function handleWizardOpenChange(nextOpen: boolean) {
    setWizardOpen(nextOpen);
    if (nextOpen) resetWizard();
  }

  function toggleRoom(roomId: string) {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId]
    );
    setRoomArrangements((prev) => ({
      ...prev,
      [roomId]: prev[roomId] ?? "SIMPLE",
    }));
  }

  function toggleFloor(floorRooms: Room[]) {
    const floorIds = floorRooms.map((room) => room.id);
    const allSelected = floorIds.every((id) => selectedRoomIds.includes(id));
    setSelectedRoomIds((prev) =>
      allSelected
        ? prev.filter((id) => !floorIds.includes(id))
        : Array.from(new Set([...prev, ...floorIds]))
    );
    setRoomArrangements((prev) => {
      const next = { ...prev };
      for (const id of floorIds) next[id] = next[id] ?? "SIMPLE";
      return next;
    });
  }

  function goToStep2() {
    setError(null);
    if (!nombre.trim()) {
      setError("Ingresa un nombre para el grupo.");
      return;
    }
    if (!fechaEntrada || !fechaSalida) {
      setError("Completa las fechas de entrada y salida.");
      return;
    }
    if (new Date(fechaSalida) <= new Date(fechaEntrada)) {
      setError("La fecha de salida debe ser posterior a la de entrada.");
      return;
    }
    const cantidad = Number(cantidadPersonas);
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      setError("Ingresa una cantidad de personas válida.");
      return;
    }
    setStep(2);
  }

  function goToStep3() {
    setError(null);
    if (selectedRoomIds.length === 0) {
      setError("Selecciona al menos una habitación.");
      return;
    }
    const cantidad = Number(cantidadPersonas);
    setMembers(
      Array.from({ length: cantidad }, () => ({
        nombre: "",
        dni: "",
        roomId: selectedRoomIds[0] ?? "",
        esFree: false,
      }))
    );
    setStep(3);
  }

  function updateMember(index: number, patch: Partial<DraftMember>) {
    setMembers((prev) =>
      prev.map((member, i) => (i === index ? { ...member, ...patch } : member))
    );
  }

  function addMemberRow() {
    setMembers((prev) => [
      ...prev,
      { nombre: "", dni: "", roomId: selectedRoomIds[0] ?? "", esFree: false },
    ]);
  }

  function removeMemberRow(index: number) {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleConfirm() {
    setError(null);

    if (
      members.length === 0 ||
      members.some(
        (member) => !member.nombre.trim() || !member.dni.trim() || !member.roomId
      )
    ) {
      setError("Completa nombre, DNI y habitación de cada integrante.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          fechaEntrada,
          fechaSalida,
          cantidadPersonas: Number(cantidadPersonas),
          members: members.map((member) => ({
            nombre: member.nombre,
            dni: member.dni,
            roomId: member.roomId,
            disposicionCama: roomArrangements[member.roomId] ?? "SIMPLE",
            esFree: member.esFree,
          })),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo crear el grupo.");
      }

      setGroups((prev) => [data as GroupWithMembers, ...prev]);
      setWizardOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo crear el grupo."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={wizardOpen} onOpenChange={handleWizardOpenChange}>
          <DialogTrigger render={<Button size="sm" />}>
            Nuevo grupo
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nuevo grupo · Paso {step} de 3</DialogTitle>
              <DialogDescription>
                {step === 1
                  ? "Datos generales del grupo."
                  : step === 2
                    ? "Selecciona las habitaciones disponibles para las fechas indicadas."
                    : "Carga los integrantes y asigna cada uno a su habitación."}
              </DialogDescription>
            </DialogHeader>

            {step === 1 ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="groupNombre">Nombre del grupo</Label>
                  <Input
                    id="groupNombre"
                    placeholder="Ej: Excursión Colegio San Martín"
                    value={nombre}
                    onChange={(event) => setNombre(event.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="fechaEntrada">Fecha de entrada</Label>
                    <Input
                      id="fechaEntrada"
                      type="date"
                      value={fechaEntrada}
                      onChange={(event) => setFechaEntrada(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="fechaSalida">Fecha de salida</Label>
                    <Input
                      id="fechaSalida"
                      type="date"
                      value={fechaSalida}
                      onChange={(event) => setFechaSalida(event.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cantidadPersonas">Cantidad de personas</Label>
                  <Input
                    id="cantidadPersonas"
                    type="number"
                    min="1"
                    value={cantidadPersonas}
                    onChange={(event) =>
                      setCantidadPersonas(event.target.value)
                    }
                  />
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="flex max-h-96 flex-col gap-4 overflow-y-auto">
                {roomsByFloor.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay habitaciones disponibles para ese rango de fechas.
                  </p>
                ) : (
                  roomsByFloor.map(([floor, floorRooms]) => (
                    <div key={floor} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Piso {floor}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFloor(floorRooms)}
                        >
                          Seleccionar piso completo
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {floorRooms.map((room) => {
                          const isSelected = selectedRoomIds.includes(room.id);
                          return (
                            <div
                              key={room.id}
                              className="flex flex-col gap-2 rounded-md border p-2.5"
                            >
                              <label className="flex items-center gap-2 text-sm font-medium">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleRoom(room.id)}
                                />
                                Hab. {room.number}
                              </label>
                              {isSelected ? (
                                <Select
                                  value={roomArrangements[room.id] ?? "SIMPLE"}
                                  onValueChange={(value) =>
                                    setRoomArrangements((prev) => ({
                                      ...prev,
                                      [room.id]:
                                        (value as BedArrangement | null) ??
                                        "SIMPLE",
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-7 w-full text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {BED_ARRANGEMENTS.map((value) => (
                                      <SelectItem key={value} value={value}>
                                        {formatBedArrangement(value)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
                {members.map((member, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap items-end gap-2 rounded-md border p-2.5"
                  >
                    <div className="flex min-w-32 flex-1 flex-col gap-1">
                      <Label className="text-xs">Nombre</Label>
                      <Input
                        className="h-8"
                        value={member.nombre}
                        onChange={(event) =>
                          updateMember(index, { nombre: event.target.value })
                        }
                      />
                    </div>
                    <div className="flex w-28 flex-col gap-1">
                      <Label className="text-xs">DNI</Label>
                      <Input
                        className="h-8"
                        value={member.dni}
                        onChange={(event) =>
                          updateMember(index, { dni: event.target.value })
                        }
                      />
                    </div>
                    <div className="flex w-40 flex-col gap-1">
                      <Label className="text-xs">Habitación</Label>
                      <Select
                        value={member.roomId}
                        onValueChange={(value) =>
                          updateMember(index, { roomId: value ?? "" })
                        }
                      >
                        <SelectTrigger className="h-8 w-full text-xs">
                          <SelectValue placeholder="Habitación" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedRooms.map((room) => (
                            <SelectItem key={room.id} value={room.id}>
                              Hab. {room.number} ·{" "}
                              {formatBedArrangement(
                                roomArrangements[room.id] ?? "SIMPLE"
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={member.esFree ? "default" : "outline"}
                      onClick={() =>
                        updateMember(index, { esFree: !member.esFree })
                      }
                    >
                      FREE
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeMemberRow(index)}
                    >
                      <X className="size-4" />
                      <span className="sr-only">Quitar integrante</span>
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMemberRow}
                  className="self-start"
                >
                  <Plus className="size-4" />
                  Agregar integrante
                </Button>
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <DialogFooter>
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep((prev) => (prev === 3 ? 2 : 1))}
                  disabled={isSaving}
                >
                  Atrás
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWizardOpen(false)}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
              )}
              {step === 1 ? (
                <Button type="button" onClick={goToStep2}>
                  Siguiente
                </Button>
              ) : step === 2 ? (
                <Button type="button" onClick={goToStep3}>
                  Siguiente
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isSaving}
                >
                  {isSaving ? "Confirmando…" : "Confirmar grupo"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aún no hay grupos</CardTitle>
            <CardDescription>
              Los grupos que crees aparecerán aquí con su estado de check-in.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const checkedIn = checkedInCount(group);
            return (
              <Card key={group.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{group.nombre}</CardTitle>
                  <CardDescription>
                    {formatDate(new Date(group.fechaEntrada))} –{" "}
                    {formatDate(new Date(group.fechaSalida))}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">
                    {group.cantidadPersonas} personas ·{" "}
                    {group.members.length} integrantes cargados
                  </p>
                  <Badge
                    className={
                      checkedIn === group.members.length
                        ? "w-fit border-transparent bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400"
                        : "w-fit border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400"
                    }
                  >
                    {checkedIn} de {group.members.length} hicieron check-in
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
