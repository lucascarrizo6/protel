import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageEmployees } from "@/lib/employees";
import { EmployeesView, type EmployeeDTO } from "./employees-view";

export default async function EmpleadosPage() {
  const session = await getServerSession(authOptions);
  const hotelId = session?.user.hotelId;

  if (!hotelId || !canManageEmployees(session?.user.role)) {
    redirect("/dashboard");
  }

  const employeesRaw = await prisma.employee.findMany({
    where: { hotelId },
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
  });

  const employees: EmployeeDTO[] = employeesRaw.map((employee) => ({
    id: employee.id,
    nombre: employee.nombre,
    puesto: employee.puesto,
    dni: employee.dni,
    cuitCuil: employee.cuitCuil,
    fechaNacimiento: employee.fechaNacimiento
      ? employee.fechaNacimiento.toISOString()
      : null,
    fechaIngreso: employee.fechaIngreso
      ? employee.fechaIngreso.toISOString()
      : null,
    telefono: employee.telefono,
    email: employee.email,
    contactoEmergenciaNombre: employee.contactoEmergenciaNombre,
    contactoEmergenciaTelefono: employee.contactoEmergenciaTelefono,
    notas: employee.notas,
    activo: employee.activo,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Personal</h1>
        <p className="text-sm text-muted-foreground">
          Datos de contacto, CUIT/CUIL y contacto de emergencia de cada
          empleado del hotel.
        </p>
      </div>

      <EmployeesView employees={employees} />
    </div>
  );
}
