"use client";

import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { UserRole } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format-date";
import { formatRole, USER_ROLES } from "@/lib/format-role";
import { slugify } from "@/lib/slugify";
import {
  DEFAULT_HOTEL_MODULES,
  HOTEL_MODULE_KEYS,
  HOTEL_MODULE_LABELS,
  type HotelModuleKey,
} from "@/lib/super-admin";

type HotelModulesData = Record<HotelModuleKey, boolean>;

type HotelSummary = {
  id: string;
  nombre: string;
  activo: boolean;
  _count: { usuarios: number };
  modules: HotelModulesData | null;
};

type UsuarioSummary = {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  creadoEn: string;
};

export function SuperAdminView({
  initialHotels,
}: {
  initialHotels: HotelSummary[];
}) {
  const [hotels, setHotels] = useState(initialHotels);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(
    initialHotels[0]?.id ?? null
  );
  const [tab, setTab] = useState<"modulos" | "usuarios">("modulos");
  const [togglingHotelId, setTogglingHotelId] = useState<string | null>(null);
  const [togglingModule, setTogglingModule] = useState<HotelModuleKey | null>(
    null
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [usuarios, setUsuarios] = useState<UsuarioSummary[]>([]);
  const [usuariosHotelId, setUsuariosHotelId] = useState<string | null>(null);
  const [isLoadingUsuarios, setIsLoadingUsuarios] = useState(false);
  const [usuariosError, setUsuariosError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const selectedHotel = hotels.find((hotel) => hotel.id === selectedHotelId) ?? null;

  function resetCreateForm() {
    setName("");
    setSlug("");
    setSlugTouched(false);
    setCreateError(null);
  }

  function handleCreateOpenChange(nextOpen: boolean) {
    setCreateOpen(nextOpen);
    if (nextOpen) resetCreateForm();
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
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

      const created = data as HotelSummary;
      setHotels((prev) => [created, ...prev]);
      setSelectedHotelId(created.id);
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

  async function handleToggleActive(hotel: HotelSummary, nextActivo: boolean) {
    setTogglingHotelId(hotel.id);
    const previous = hotel.activo;
    setHotels((prev) =>
      prev.map((h) => (h.id === hotel.id ? { ...h, activo: nextActivo } : h))
    );

    try {
      const response = await fetch(`/api/super-admin/hotels/${hotel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: nextActivo }),
      });

      if (!response.ok) throw new Error("Request failed");
    } catch {
      setHotels((prev) =>
        prev.map((h) => (h.id === hotel.id ? { ...h, activo: previous } : h))
      );
    } finally {
      setTogglingHotelId(null);
    }
  }

  async function handleToggleModule(
    hotel: HotelSummary,
    modulo: HotelModuleKey,
    valor: boolean
  ) {
    setTogglingModule(modulo);
    const previous = hotel.modules?.[modulo] ?? DEFAULT_HOTEL_MODULES[modulo];

    // Se reconstruye el objeto completo desde los defaults por si el hotel no
    // tiene todavía una fila HotelModules (modules === null): así el toggle no
    // queda como no-op y el Switch controlado puede moverse.
    const applyModule = (value: boolean) =>
      setHotels((prev) =>
        prev.map((h) =>
          h.id === hotel.id
            ? {
                ...h,
                modules: {
                  ...DEFAULT_HOTEL_MODULES,
                  ...h.modules,
                  [modulo]: value,
                },
              }
            : h
        )
      );

    applyModule(valor);

    try {
      const response = await fetch(
        `/api/super-admin/hotels/${hotel.id}/modules`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modulo, valor }),
        }
      );

      if (!response.ok) throw new Error("Request failed");
    } catch {
      applyModule(previous);
      toast.error(
        `No se pudo cambiar el módulo ${HOTEL_MODULE_LABELS[modulo]}. Probá de nuevo.`
      );
    } finally {
      setTogglingModule(null);
    }
  }

  async function loadUsuarios(hotelId: string) {
    setUsuariosHotelId(hotelId);
    setIsLoadingUsuarios(true);
    setUsuariosError(null);

    try {
      const response = await fetch(
        `/api/super-admin/hotels/${hotelId}/usuarios`
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudieron cargar los usuarios.");
      }

      setUsuarios(data as UsuarioSummary[]);
    } catch (err) {
      setUsuariosError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los usuarios."
      );
    } finally {
      setIsLoadingUsuarios(false);
    }
  }

  function selectHotel(hotel: HotelSummary) {
    setSelectedHotelId(hotel.id);
    setTab("modulos");
  }

  function handleTabChange(value: string) {
    setTab(value as "modulos" | "usuarios");
    if (value === "usuarios" && selectedHotel && usuariosHotelId !== selectedHotel.id) {
      loadUsuarios(selectedHotel.id);
    }
  }

  async function handleRoleChange(usuario: UsuarioSummary, rol: UserRole) {
    setUpdatingUserId(usuario.id);
    setUsuariosError(null);
    const previous = usuario.rol;
    setUsuarios((prev) =>
      prev.map((u) => (u.id === usuario.id ? { ...u, rol } : u))
    );

    try {
      const response = await fetch(`/api/super-admin/usuarios/${usuario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rol }),
      });

      if (!response.ok) throw new Error("Request failed");
    } catch {
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuario.id ? { ...u, rol: previous } : u))
      );
      setUsuariosError("No se pudo actualizar el rol. Inténtalo de nuevo.");
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handleDeleteUser(usuario: UsuarioSummary) {
    setUpdatingUserId(usuario.id);
    setUsuariosError(null);

    try {
      const response = await fetch(`/api/super-admin/usuarios/${usuario.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo eliminar el usuario.");
      }

      setUsuarios((prev) => prev.filter((u) => u.id !== usuario.id));
      if (selectedHotel) {
        setHotels((prev) =>
          prev.map((h) =>
            h.id === selectedHotel.id
              ? { ...h, _count: { usuarios: h._count.usuarios - 1 } }
              : h
          )
        );
      }
    } catch (err) {
      setUsuariosError(
        err instanceof Error ? err.message : "No se pudo eliminar el usuario."
      );
    } finally {
      setUpdatingUserId(null);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="flex flex-col gap-3">
        <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
          <DialogTrigger render={<Button size="sm" className="self-start" />}>
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
          hotels.map((hotel) => (
            <Card
              key={hotel.id}
              className={
                hotel.id === selectedHotelId
                  ? "cursor-pointer border-foreground/30 py-0"
                  : "cursor-pointer py-0"
              }
              onClick={() => selectHotel(hotel)}
            >
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{hotel.nombre}</span>
                  <Badge
                    className={
                      hotel.activo
                        ? "border-transparent bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400"
                        : "border-transparent bg-slate-100 text-slate-800 dark:bg-slate-500/15 dark:text-slate-400"
                    }
                  >
                    {hotel.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {hotel._count.usuarios} usuario(s)
                  </span>
                  <div onClick={(event) => event.stopPropagation()}>
                    <Switch
                      checked={hotel.activo}
                      disabled={togglingHotelId === hotel.id}
                      onCheckedChange={(checked) => {
                        handleToggleActive(hotel, checked);
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div>
        {!selectedHotel ? (
          <Card>
            <CardHeader>
              <CardTitle>Selecciona un hotel</CardTitle>
              <CardDescription>
                Elegí un hotel de la lista para ver sus módulos y usuarios.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Tabs value={tab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="modulos">Módulos</TabsTrigger>
              <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
            </TabsList>

            <TabsContent value="modulos">
              <Card>
                <CardHeader>
                  <CardTitle>Módulos de {selectedHotel.nombre}</CardTitle>
                  <CardDescription>
                    Activa o desactiva las funciones disponibles para este
                    hotel.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {HOTEL_MODULE_KEYS.map((key) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-4 rounded-lg border p-3"
                    >
                      <span className="text-sm font-medium">
                        {HOTEL_MODULE_LABELS[key]}
                      </span>
                      <Switch
                        checked={
                          selectedHotel.modules?.[key] ??
                          DEFAULT_HOTEL_MODULES[key]
                        }
                        disabled={togglingModule === key}
                        onCheckedChange={(checked) =>
                          handleToggleModule(selectedHotel, key, checked)
                        }
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="usuarios">
              <Card className="py-0">
                {isLoadingUsuarios ? (
                  <CardContent className="p-4 text-sm text-muted-foreground">
                    Cargando usuarios…
                  </CardContent>
                ) : usuarios.length === 0 ? (
                  <CardHeader>
                    <CardTitle>Sin usuarios</CardTitle>
                    <CardDescription>
                      Este hotel todavía no tiene usuarios cargados.
                    </CardDescription>
                  </CardHeader>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Creado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usuarios.map((usuario) => (
                        <TableRow key={usuario.id}>
                          <TableCell className="font-medium">
                            {usuario.nombre}
                          </TableCell>
                          <TableCell>{usuario.email}</TableCell>
                          <TableCell>
                            <Select
                              value={usuario.rol}
                              onValueChange={(value) =>
                                value &&
                                handleRoleChange(usuario, value as UserRole)
                              }
                            >
                              <SelectTrigger
                                className="w-44"
                                disabled={updatingUserId === usuario.id}
                              >
                                <SelectValue>
                                  {(value: UserRole | null) =>
                                    value ? formatRole(value) : ""
                                  }
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {USER_ROLES.map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {formatRole(role)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {formatDate(new Date(usuario.creadoEn))}
                          </TableCell>
                          <TableCell className="text-right">
                            {usuario.rol === "SUPER_ADMIN" ? (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            ) : (
                              <AlertDialog>
                                <AlertDialogTrigger
                                  render={
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      disabled={updatingUserId === usuario.id}
                                    />
                                  }
                                >
                                  <Trash2 className="size-4 text-destructive" />
                                  <span className="sr-only">Eliminar</span>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      ¿Eliminar a {usuario.nombre}?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción no se puede deshacer.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancelar
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteUser(usuario)}
                                    >
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {usuariosError ? (
                  <p role="alert" className="p-4 text-sm text-destructive">
                    {usuariosError}
                  </p>
                ) : null}
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
