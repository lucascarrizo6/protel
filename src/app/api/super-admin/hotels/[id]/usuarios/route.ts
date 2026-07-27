import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const usuarios = await prisma.user.findMany({
    where: { hotelId: params.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    usuarios.map((usuario) => ({
      id: usuario.id,
      nombre: usuario.name,
      email: usuario.email,
      rol: usuario.role,
      creadoEn: usuario.createdAt,
    }))
  );
}
