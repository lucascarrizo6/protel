import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  emptyDashboardData,
  getDashboardData,
} from "@/lib/dashboard-data";
import { DashboardGrid } from "./dashboard-grid";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  // BLOQUE DE SEGURIDAD: Expulsa a la mucama antes de que carguen los datos
  if (session?.user?.role === "HOUSEKEEPING") {
    redirect("/dashboard/mucama");
  }

  const hotelId = session?.user.hotelId;

  const data = hotelId
    ? await getDashboardData(hotelId)
    : emptyDashboardData();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Bienvenido, {session?.user.name ?? session?.user.email}
        </h1>
        <p className="text-sm text-muted-foreground">
          Actividad del día y métricas de tu propiedad. Arrastrá los widgets
          desde los puntitos para acomodarlos a tu gusto.
        </p>
      </div>

      <DashboardGrid data={data} userId={session?.user.id ?? "anon"} />
    </div>
  );
}