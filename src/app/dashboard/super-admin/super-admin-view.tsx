"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff, KeyRound, Trash2 } from "lucide-react";
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
  BILLING_STATUS_BADGE_CLASS,
  BILLING_STATUS_LABELS,
  DEFAULT_HOTEL_MODULES,
  HOTEL_MODULE_KEYS,
  HOTEL_MODULE_LABELS,
  type HotelModuleKey,
} from "@/lib/super-admin";
import { BillingPanel, type HotelBillingDTO } from "./billing-panel";

type HotelModulesData = Record<HotelModuleKey, boolean>;

type HotelSummary = {
  id: string;
  nombre: string;
  activo: boolean;
  _count: { usuarios: number };
  modules: HotelModulesData | null;
  billing: HotelBillingDTO;
};

type UsuarioSummary = {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  creadoEn: string;
};

const HOTEL_USER_ROLES = USER_ROLES.filter((role) => role !== "SUPER_ADMIN");

export function SuperAdminView({
  initialHotels,
}: {
  initialHotels: HotelSummary[];
}) {
  const [hotels, setHotels] = useState(initialHotels);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(
    initialHotels[0]?.id ?? null
  );
  const [hotelSearch, setHotelSearch] = useState("");
  const [tab, setTab] = useState<"modulos" | "facturacion" | "usuarios">(
    "modulos"
  );
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

  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [userNombre, setUserNombre] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [userRol, setUserRol] = useState<UserRole>("RECEPTIONIST");
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);

  const [resetPasswordUser, setResetPasswordUser] = useState<UsuarioSummary | null>(
    null
  );
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(
    null
  );

  const selectedHotel = hotels.find((hotel) => hotel.id === selectedHotelId) ?? null;

  const normalizedSearch = hotelSearch.trim().toLowerCase();
  const filteredHotels = normalizedSearch
    ? hotels.filter((hotel) =>
        hotel.nombre.toLowerCase().includes(normalizedSearch)
      )
    : hotels;

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
    setTab(value as "modulos" | "facturacion" | "usuarios");
    if (value === "usuarios" && selectedHotel && usuariosHotelId !== selectedHotel.id) {
      loadUsuarios(selectedHotel.id);
    }
  }

  function handleBillingUpdated(
    hotelId: string,
    billing: NonNullable<HotelBillingDTO>
  ) {
    setHotels((prev) =>
      prev.map((h) => (h.id === hotelId ? { ...h, billing } : h))
    );
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

  function openResetPassword(usuario: UsuarioSummary) {
    setResetPasswordUser(usuario);
    setResetPassword("");
    setShowResetPassword(false);
    setResetPasswordError(null);
  }

  async function handleResetPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetPasswordUser) return;
    setResetPasswordError(null);

    if (resetPassword.length < 8) {
      setResetPasswordError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setIsResettingPassword(true);

    try {
      const response = await fetch(
        `/api/super-admin/usuarios/${resetPasswordUser.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: resetPassword }),
        }
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo resetear la contraseña.");
      }

      toast.success(`Contraseña actualizada para ${resetPasswordUser.nombre}.`);
      setResetPasswordUser(null);
    } catch (err) {
      setResetPasswordError(
        err instanceof Error
          ? err.message
          : "No se pudo resetear la contraseña. Inténtalo de nuevo."
      );
    } finally {
      setIsResettingPassword(false);
    }
  }

  function resetCreateUserForm() {
    setUserNombre("");
    setUserEmail("");
    setUserPassword("");
    setShowUserPassword(false);
    setUserRol("RECEPTIONIST");
    setCreateUserError(null);
  }

  function handleCreateUserOpenChange(nextOpen: boolean) {
    setCreateUserOpen(nextOpen);
    if (nextOpen) resetCreateUserForm();
  }

  async function handleCreateUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedHotel) return;
    setCreateUserError(null);

    if (!userNombre.trim() || !userEmail.trim() || !userPassword) {
      setCreateUserError("Completa nombre, email y contraseña.");
      return;
    }

    if (userPassword.length < 8) {
      setCreateUserError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setIsCreatingUser(true);

    try {
      const response = await fetch(
        `/api/super-admin/hotels/${selectedHotel.id}/usuarios`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: userNombre,
            email: userEmail,
            password: userPassword,
            rol: userRol,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo crear el usuario.");
      }

      const created = data as UsuarioSummary;
      setUsuarios((prev) => [...prev, created]);
      setHotels((prev) =>
        prev.map((h) =>
          h.id === selectedHotel.id
            ? { ...h, _count: { usuarios: h._count.usuarios + 1 } }
            : h
        )
      );
      setCreateUserOpen(false);
    } catch (err) {
      setCreateUserError(
        err instanceof Error
          ? err.message
          : "No se pudo crear el usuario. Inténtalo de nuevo."
      );
    } finally {
      setIsCreatingUser(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
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
          <Button
            variant="outline"
            size="sm"
            render={<a href="/api/super-admin/hotels/export" download />}
          >
            Exportar CSV
          </Button>
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
          <>
            <Input
              placeholder="Buscar hotel…"
              value={hotelSearch}
              onChange={(event) => setHotelSearch(event.target.value)}
            />
            {filteredHotels.length === 0 ? (
              <p className="px-1 text-sm text-muted-foreground">
                Ningún hotel coincide con &quot;{hotelSearch}&quot;.
              </p>
            ) : null}
            {filteredHotels.map((hotel) => (
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
                    {hotel.billing?.plan || "Sin plan cargado"}
                  </span>
                  <Badge
                    className={
                      BILLING_STATUS_BADGE_CLASS[hotel.billing?.status ?? "PENDIENTE"]
                    }
                  >
                    {BILLING_STATUS_LABELS[hotel.billing?.status ?? "PENDIENTE"]}
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
            ))}
          </>
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
          <div key={selectedHotel.id} className="hotel-switch-animate">
          <Tabs value={tab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="modulos">Módulos</TabsTrigger>
              <TabsTrigger value="facturacion">Facturación</TabsTrigger>
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

            <TabsContent value="facturacion">
              <BillingPanel
                hotelId={selectedHotel.id}
                hotelNombre={selectedHotel.nombre}
                billing={selectedHotel.billing}
                onUpdated={(billing) =>
                  handleBillingUpdated(selectedHotel.id, billing)
                }
              />
            </TabsContent>

            <TabsContent value="usuarios" className="flex flex-col gap-3">
              <Dialog open={createUserOpen} onOpenChange={handleCreateUserOpenChange}>
                <DialogTrigger render={<Button size="sm" className="self-start" />}>
                  Crear usuario
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleCreateUserSubmit} className="contents">
                    <DialogHeader>
                      <DialogTitle>Crear usuario</DialogTitle>
                      <DialogDescription>
                        Da de alta un usuario para {selectedHotel.nombre}.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="userNombre">Nombre</Label>
                        <Input
                          id="userNombre"
                          required
                          value={userNombre}
                          onChange={(event) => setUserNombre(event.target.value)}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="userEmail">Email</Label>
                        <Input
                          id="userEmail"
                          type="email"
                          required
                          value={userEmail}
                          onChange={(event) => setUserEmail(event.target.value)}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="userPassword">Contraseña</Label>
                        <div className="relative">
                          <Input
                            id="userPassword"
                            type={showUserPassword ? "text" : "password"}
                            required
                            minLength={8}
                            className="pr-8"
                            value={userPassword}
                            onChange={(event) => setUserPassword(event.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowUserPassword((prev) => !prev)}
                            className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-muted-foreground hover:text-foreground"
                          >
                            {showUserPassword ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                            <span className="sr-only">
                              {showUserPassword
                                ? "Ocultar contraseña"
                                : "Mostrar contraseña"}
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="userRol">Rol</Label>
                        <Select
                          value={userRol}
                          onValueChange={(value) => value && setUserRol(value as UserRole)}
                        >
                          <SelectTrigger id="userRol">
                            <SelectValue>
                              {(value: UserRole | null) =>
                                value ? formatRole(value) : ""
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {HOTEL_USER_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {formatRole(role)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {createUserError ? (
                        <p role="alert" className="text-sm text-destructive">
                          {createUserError}
                        </p>
                      ) : null}
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCreateUserOpen(false)}
                        disabled={isCreatingUser}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isCreatingUser}>
                        {isCreatingUser ? "Creando…" : "Crear usuario"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

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
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                disabled={updatingUserId === usuario.id}
                                onClick={() => openResetPassword(usuario)}
                              >
                                <KeyRound className="size-4" />
                                <span className="sr-only">
                                  Resetear contraseña
                                </span>
                              </Button>
                              {usuario.rol === "SUPER_ADMIN" ? null : (
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
                            </div>
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

              <Dialog
                open={resetPasswordUser !== null}
                onOpenChange={(open) => {
                  if (!open) setResetPasswordUser(null);
                }}
              >
                <DialogContent>
                  <form onSubmit={handleResetPasswordSubmit} className="contents">
                    <DialogHeader>
                      <DialogTitle>Resetear contraseña</DialogTitle>
                      <DialogDescription>
                        Nueva contraseña para {resetPasswordUser?.nombre}. La
                        anterior deja de funcionar.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="resetPassword">Contraseña nueva</Label>
                        <div className="relative">
                          <Input
                            id="resetPassword"
                            type={showResetPassword ? "text" : "password"}
                            required
                            minLength={8}
                            className="pr-8"
                            value={resetPassword}
                            onChange={(event) =>
                              setResetPassword(event.target.value)
                            }
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowResetPassword((prev) => !prev)
                            }
                            className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-muted-foreground hover:text-foreground"
                          >
                            {showResetPassword ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                            <span className="sr-only">
                              {showResetPassword
                                ? "Ocultar contraseña"
                                : "Mostrar contraseña"}
                            </span>
                          </button>
                        </div>
                      </div>

                      {resetPasswordError ? (
                        <p role="alert" className="text-sm text-destructive">
                          {resetPasswordError}
                        </p>
                      ) : null}
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setResetPasswordUser(null)}
                        disabled={isResettingPassword}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isResettingPassword}>
                        {isResettingPassword ? "Guardando…" : "Guardar"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </TabsContent>
          </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
