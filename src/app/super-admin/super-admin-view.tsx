"use client";

import { useState, type FormEvent } from "react";
import type { Hotel, HotelModule, Module } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format-date";
import { slugify } from "@/lib/slugify";

type HotelWithCounts = Hotel & { _count: { rooms: number; users: number } };

function moduleKey(hotelId: string, moduleId: string) {
  return `${hotelId}:${moduleId}`;
}

export function SuperAdminView({
  initialHotels,
  modules,
  initialHotelModules,
}: {
  initialHotels: HotelWithCounts[];
  modules: Module[];
  initialHotelModules: HotelModule[];
}) {
  const [hotels, setHotels] = useState(initialHotels);
  const [enabledByKey, setEnabledByKey] = useState<Record<string, boolean>>(
    () => {
      const map: Record<string, boolean> = {};
      for (const hotelModule of initialHotelModules) {
        map[moduleKey(hotelModule.hotelId, hotelModule.moduleId)] =
          hotelModule.enabled;
      }
      return map;
    }
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [modulesHotelId, setModulesHotelId] = useState<string | null>(null);
  const [togglingModuleId, setTogglingModuleId] = useState<string | null>(
    null
  );
  const [modulesError, setModulesError] = useState<string | null>(null);

  const modulesHotel = hotels.find((hotel) => hotel.id === modulesHotelId) ?? null;

  function resetCreateForm() {
    setName("");
    setSlug("");
    setSlugTouched(false);
    setCreateError(null);
  }

  function handleCreateOpenChange(nextOpen: boolean) {
    setCreateOpen(nextOpen);
    if (nextOpen) {
      resetCreateForm();
    }
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(value);
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);

    if (!name.trim() || !slug.trim()) {
      setCreateError("Completa el nombre y el slug.");
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch("/api/super-admin/hotels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo crear el hotel.");
      }

      setHotels((prev) => [data as HotelWithCounts, ...prev]);
      setCreateOpen(false);
    } catch (err) {
      setCreateError(
        err instanceof Error
          ? err.message
          : "No se pudo crear el hotel. Inténtalo de nuevo."
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggleModule(moduleId: string, nextEnabled: boolean) {
    if (!modulesHotel) return;

    setModulesError(null);
    setTogglingModuleId(moduleId);

    const key = moduleKey(modulesHotel.id, moduleId);
    const previous = enabledByKey[key] ?? false;
    setEnabledByKey((prev) => ({ ...prev, [key]: nextEnabled }));

    try {
      const response = await fetch(
        `/api/super-admin/hotels/${modulesHotel.id}/modules`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moduleId, enabled: nextEnabled }),
        }
      );

      if (!response.ok) {
        throw new Error("Request failed");
      }
    } catch {
      setEnabledByKey((prev) => ({ ...prev, [key]: previous }));
      setModulesError("No se pudo actualizar el módulo. Inténtalo de nuevo.");
    } finally {
      setTogglingModuleId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
          <DialogTrigger render={<Button size="sm" />}>
            Crear hotel
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateSubmit} className="contents">
              <DialogHeader>
                <DialogTitle>Crear hotel</DialogTitle>
                <DialogDescription>
                  Registra un nuevo hotel en la plataforma.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="hotelName">Nombre</Label>
                  <Input
                    id="hotelName"
                    required
                    value={name}
                    onChange={(event) => handleNameChange(event.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="hotelSlug">Slug</Label>
                  <Input
                    id="hotelSlug"
                    required
                    value={slug}
                    onChange={(event) => handleSlugChange(event.target.value)}
                  />
                </div>

                {createError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {createError}
                  </p>
                ) : null}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                  disabled={isCreating}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creando…" : "Crear hotel"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {hotels.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aún no hay hoteles</CardTitle>
            <CardDescription>
              Los hoteles registrados en la plataforma aparecerán aquí.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead>Habitaciones</TableHead>
                <TableHead>Usuarios</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hotels.map((hotel) => (
                <TableRow key={hotel.id}>
                  <TableCell className="font-medium">{hotel.name}</TableCell>
                  <TableCell>{hotel.slug}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        hotel.active
                          ? "border-transparent bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400"
                          : "border-transparent bg-slate-100 text-slate-800 dark:bg-slate-500/15 dark:text-slate-400"
                      }
                    >
                      {hotel.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(new Date(hotel.createdAt))}</TableCell>
                  <TableCell>{hotel._count.rooms}</TableCell>
                  <TableCell>{hotel._count.users}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setModulesHotelId(hotel.id);
                        setModulesError(null);
                      }}
                    >
                      Gestionar módulos
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog
        open={modulesHotelId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setModulesHotelId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Módulos de {modulesHotel?.name}</DialogTitle>
            <DialogDescription>
              Activa o desactiva los módulos disponibles para este hotel.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            {modules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavía no hay módulos configurados en la plataforma.
              </p>
            ) : (
              modules.map((module) => {
                const key = modulesHotel
                  ? moduleKey(modulesHotel.id, module.id)
                  : "";
                const enabled = enabledByKey[key] ?? false;
                return (
                  <div
                    key={module.id}
                    className="flex items-center justify-between gap-4 rounded-lg border p-3"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{module.name}</span>
                      {module.description ? (
                        <span className="text-xs text-muted-foreground">
                          {module.description}
                        </span>
                      ) : null}
                    </div>
                    <Switch
                      checked={enabled}
                      disabled={togglingModuleId === module.id}
                      onCheckedChange={(checked) =>
                        handleToggleModule(module.id, checked)
                      }
                    />
                  </div>
                );
              })
            )}

            {modulesError ? (
              <p role="alert" className="text-sm text-destructive">
                {modulesError}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModulesHotelId(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
