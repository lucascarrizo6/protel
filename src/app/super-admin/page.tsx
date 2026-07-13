import { prisma } from "@/lib/prisma";
import { SuperAdminView } from "./super-admin-view";

export default async function SuperAdminPage() {
  const [hotels, modules, hotelModules] = await Promise.all([
    prisma.hotel.findMany({
      include: { _count: { select: { rooms: true, users: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.module.findMany({ orderBy: { name: "asc" } }),
    prisma.hotelModule.findMany(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Hoteles</h1>
        <p className="text-sm text-muted-foreground">
          Administra los hoteles registrados en la plataforma y sus módulos
          habilitados.
        </p>
      </div>

      <SuperAdminView
        initialHotels={hotels}
        modules={modules}
        initialHotelModules={hotelModules}
      />
    </div>
  );
}
