import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UsuariosView } from "./usuarios-view";

export default async function UsuariosPage() {
  const session = await getServerSession(authOptions);
  const hotelId = session?.user.hotelId;

  if (session?.user.role !== "HOTEL_ADMIN" || !hotelId) {
    redirect("/dashboard");
  }

  const usuarios = await prisma.user.findMany({
    where: { hotelId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Da de alta a tu equipo — recepción, mucama, mantenimiento — con su
          propio login para este hotel.
        </p>
      </div>

      <UsuariosView
        currentUserId={session.user.id}
        initialUsuarios={usuarios.map((usuario) => ({
          id: usuario.id,
          nombre: usuario.name,
          email: usuario.email,
          rol: usuario.role,
          creadoEn: usuario.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
