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
      billing: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Super Admin</h1>
        <p className="text-sm text-muted-foreground">
          Administra los hoteles registrados, sus módulos, sus usuarios y lo
          que cada uno te paga por usar Hotar.
        </p>
      </div>

      <SuperAdminView initialHotels={hotels.map(serializeHotel)} />
    </div>
  );
}
