import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeHotel } from "@/lib/super-admin";
import { SuperAdminView } from "./super-admin-view";

export default async function SuperAdminPage() {
  const session = await getServerSession(authOptions);

  if (session?.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const hotels = await prisma.hotel.findMany({
    include: {
      _count: { select: { users: true } },
      modules: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Super Admin</h1>
        <p className="text-sm text-muted-foreground">
          Administra los hoteles registrados, sus módulos y sus usuarios.
        </p>
      </div>

      <SuperAdminView initialHotels={hotels.map(serializeHotel)} />
    </div>
  );
}
