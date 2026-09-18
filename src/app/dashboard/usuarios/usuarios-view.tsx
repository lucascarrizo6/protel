"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import type { UserRole } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const HOTEL_USER_ROLES = USER_ROLES.filter((role) => role !== "SUPER_ADMIN");

type UsuarioSummary = {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  creadoEn: string;
};

export function UsuariosView({
  currentUserId,
  initialUsuarios,
}: {
  currentUserId: string;
  initialUsuarios: UsuarioSummary[];
}) {
  const [usuarios, setUsuarios] = useState(initialUsuarios);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rol, setRol] = useState<UserRole>("RECEPTIONIST");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  function resetCreateForm() {
    setNombre("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setRol("RECEPTIONIST");
    setCreateError(null);
  }

  function handleCreateOpenChange(nextOpen: boolean) {
    setCreateOpen(nextOpen);
    if (nextOpen) resetCreateForm();
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);

    if (!nombre.trim() || !email.trim() || !password) {
      setCreateError("Completa nombre, email y contraseña.");
      return;
    }
    if (password.length < 8) {
      setCreateError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, password, rol }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo crear el usuario.");
      }

      setUsuarios((prev) => [...prev, data as UsuarioSummary]);
      setCreateOpen(false);
    } catch (err) {
      setCreateError(
        err instanceof Error
          ? err.message
          : "No se pudo crear el usuario. Inténtalo de nuevo."
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRoleChange(usuario: UsuarioSummary, nuevoRol: UserRole) {
    setUpdatingUserId(usuario.id);
    setError(null);
    const previous = usuario.rol;
    setUsuarios((prev) =>
      prev.map((u) => (u.id === usuario.id ? { ...u, rol: nuevoRol } : u))
    );

    try {
      const response = await fetch(`/api/usuarios/${usuario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rol: nuevoRol }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo actualizar el rol.");
      }
    } catch (err) {
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuario.id ? { ...u, rol: previous } : u))
      );
      setError(
        err instanceof Error ? err.message : "No se pudo actualizar el rol."
      );
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handleDelete(usuario: UsuarioSummary) {
    setUpdatingUserId(usuario.id);
    setError(null);

    try {
      const response = await fetch(`/api/usuarios/${usuario.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo eliminar el usuario.");
      }
      setUsuarios((prev) => prev.filter((u) => u.id !== usuario.id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo eliminar el usuario."
      );
    } finally {
      setUpdatingUserId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
        <DialogTrigger render={<Button size="sm" className="self-start" />}>
          Crear usuario
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={handleCreateSubmit} className="contents">
            <DialogHeader>
              <DialogTitle>Crear usuario</DialogTitle>
              <DialogDescription>
                Da de alta a alguien de tu equipo, con su propio login.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  required
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    className="pr-8"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                    <span className="sr-only">
                      {showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rol">Rol</Label>
                <Select
                  value={rol}
                  onValueChange={(value) => value && setRol(value as UserRole)}
                >
                  <SelectTrigger id="rol">
                    <SelectValue>
                      {(value: UserRole | null) => (value ? formatRole(value) : "")}
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
                {isCreating ? "Creando…" : "Crear usuario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="py-0">
        {usuarios.length === 0 ? (
          <CardContent className="p-4 text-sm text-muted-foreground">
            Todavía no cargaste a nadie de tu equipo.
          </CardContent>
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
              {usuarios.map((usuario) => {
                const esUnoMismo = usuario.id === currentUserId;
                return (
                  <TableRow key={usuario.id}>
                    <TableCell className="font-medium">
                      {usuario.nombre}
                      {esUnoMismo ? (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          (vos)
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>{usuario.email}</TableCell>
                    <TableCell>
                      <Select
                        value={usuario.rol}
                        onValueChange={(value) =>
                          value && handleRoleChange(usuario, value as UserRole)
                        }
                      >
                        <SelectTrigger
                          className="w-44"
                          disabled={esUnoMismo || updatingUserId === usuario.id}
                        >
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
                    </TableCell>
                    <TableCell>
                      {formatDate(new Date(usuario.creadoEn))}
                    </TableCell>
                    <TableCell className="text-right">
                      {esUnoMismo ? (
                        <span className="text-xs text-muted-foreground">—</span>
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
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(usuario)}
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {error ? (
          <p role="alert" className="p-4 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
