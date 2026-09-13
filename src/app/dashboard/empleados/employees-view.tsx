"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { formatDate } from "@/lib/format-date";
import { formatCuitCuil } from "@/lib/employees";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type EmployeeDTO = {
  id: string;
  nombre: string;
  puesto: string;
  dni: string | null;
  cuitCuil: string | null;
  fechaNacimiento: string | null;
  fechaIngreso: string | null;
  telefono: string | null;
  email: string | null;
  contactoEmergenciaNombre: string | null;
  contactoEmergenciaTelefono: string | null;
  notas: string | null;
  activo: boolean;
};

const EMPTY_FORM = {
  nombre: "",
  puesto: "",
  dni: "",
  cuitCuil: "",
  fechaNacimiento: "",
  fechaIngreso: "",
  telefono: "",
  email: "",
  contactoEmergenciaNombre: "",
  contactoEmergenciaTelefono: "",
  notas: "",
  activo: true,
};

type FormState = typeof EMPTY_FORM;

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function employeeToForm(employee: EmployeeDTO): FormState {
  return {
    nombre: employee.nombre,
    puesto: employee.puesto,
    dni: employee.dni ?? "",
    cuitCuil: employee.cuitCuil ?? "",
    fechaNacimiento: toDateInputValue(employee.fechaNacimiento),
    fechaIngreso: toDateInputValue(employee.fechaIngreso),
    telefono: employee.telefono ?? "",
    email: employee.email ?? "",
    contactoEmergenciaNombre: employee.contactoEmergenciaNombre ?? "",
    contactoEmergenciaTelefono: employee.contactoEmergenciaTelefono ?? "",
    notas: employee.notas ?? "",
    activo: employee.activo,
  };
}

export function EmployeesView({ employees }: { employees: EmployeeDTO[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<EmployeeDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const isOpen = creating || selected !== null;

  function openNew() {
    setForm(EMPTY_FORM);
    setCreating(true);
    setSelected(null);
  }

  function openEmployee(employee: EmployeeDTO) {
    setForm(employeeToForm(employee));
    setSelected(employee);
    setCreating(false);
  }

  function close() {
    setCreating(false);
    setSelected(null);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (!form.nombre.trim() || !form.puesto.trim()) {
      toast.error("Completá al menos el nombre y el puesto.");
      return;
    }
    setSaving(true);
    try {
      const url = selected
        ? `/api/employees/${selected.id}`
        : "/api/employees";
      const method = selected ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo guardar.");
      }
      toast.success(selected ? "Empleado actualizado." : "Empleado agregado.");
      close();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!selected) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/employees/${selected.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo eliminar.");
      }
      toast.success("Empleado eliminado.");
      close();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <UserPlus />
          Nuevo empleado
        </Button>
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Puesto</TableHead>
              <TableHead>CUIT/CUIL</TableHead>
              <TableHead>Cumpleaños</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Todavía no cargaste ningún empleado.
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => (
                <TableRow
                  key={employee.id}
                  className="cursor-pointer"
                  onClick={() => openEmployee(employee)}
                >
                  <TableCell className="font-medium">
                    {employee.nombre}
                  </TableCell>
                  <TableCell>{employee.puesto}</TableCell>
                  <TableCell>
                    {employee.cuitCuil
                      ? formatCuitCuil(employee.cuitCuil)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {employee.fechaNacimiento
                      ? formatDate(new Date(employee.fechaNacimiento))
                      : "—"}
                  </TableCell>
                  <TableCell>{employee.telefono ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={employee.activo ? "default" : "secondary"}>
                      {employee.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Sheet
        open={isOpen}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {selected ? selected.nombre : "Nuevo empleado"}
            </SheetTitle>
            <SheetDescription>
              {selected
                ? "Editá sus datos o dalo de baja."
                : "Cargá los datos básicos del empleado."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emp-nombre">Nombre completo</Label>
                <Input
                  id="emp-nombre"
                  value={form.nombre}
                  onChange={(e) => set("nombre", e.target.value)}
                  placeholder="Nombre y apellido"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emp-puesto">Puesto</Label>
                <Input
                  id="emp-puesto"
                  value={form.puesto}
                  onChange={(e) => set("puesto", e.target.value)}
                  placeholder="Recepción, Mucama, Mantenimiento…"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emp-dni">DNI</Label>
                <Input
                  id="emp-dni"
                  value={form.dni}
                  onChange={(e) => set("dni", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emp-cuit">CUIT/CUIL</Label>
                <Input
                  id="emp-cuit"
                  value={form.cuitCuil}
                  onChange={(e) => set("cuitCuil", e.target.value)}
                  placeholder="20123456783"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emp-nacimiento">Cumpleaños</Label>
                <Input
                  id="emp-nacimiento"
                  type="date"
                  value={form.fechaNacimiento}
                  onChange={(e) => set("fechaNacimiento", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emp-ingreso">Fecha de ingreso</Label>
                <Input
                  id="emp-ingreso"
                  type="date"
                  value={form.fechaIngreso}
                  onChange={(e) => set("fechaIngreso", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emp-telefono">Teléfono</Label>
                <Input
                  id="emp-telefono"
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => set("telefono", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emp-email">Email</Label>
                <Input
                  id="emp-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-md border p-3">
              <p className="text-sm font-medium">Contacto de emergencia</p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emp-emerg-nombre">Nombre</Label>
                <Input
                  id="emp-emerg-nombre"
                  value={form.contactoEmergenciaNombre}
                  onChange={(e) =>
                    set("contactoEmergenciaNombre", e.target.value)
                  }
                  placeholder="Quién avisar en una urgencia"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emp-emerg-telefono">Teléfono</Label>
                <Input
                  id="emp-emerg-telefono"
                  type="tel"
                  value={form.contactoEmergenciaTelefono}
                  onChange={(e) =>
                    set("contactoEmergenciaTelefono", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-notas">Notas</Label>
              <Textarea
                id="emp-notas"
                rows={2}
                value={form.notas}
                onChange={(e) => set("notas", e.target.value)}
                placeholder="Cualquier otra cosa que quieras recordar"
              />
            </div>

            {selected ? (
              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <Label htmlFor="emp-activo">Empleado activo</Label>
                <Switch
                  id="emp-activo"
                  checked={form.activo}
                  onCheckedChange={(checked) => set("activo", checked)}
                />
              </div>
            ) : null}
          </div>

          <SheetFooter className="flex-row justify-between sm:justify-between">
            {selected ? (
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button variant="outline" disabled={saving}>
                      Eliminar
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      ¿Eliminar a {selected.nombre}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Si preferís conservar
                      el historial, mejor marcalo como inactivo en vez de
                      eliminarlo.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={remove}>
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={close} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
