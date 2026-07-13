import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const moduleId = typeof body?.moduleId === "string" ? body.moduleId : "";
  const enabled = body?.enabled === true;

  if (!moduleId) {
    return NextResponse.json(
      { error: "Falta el módulo a actualizar." },
      { status: 400 }
    );
  }

  const [hotel, module_] = await Promise.all([
    prisma.hotel.findUnique({ where: { id: params.id } }),
    prisma.module.findUnique({ where: { id: moduleId } }),
  ]);

  if (!hotel) {
    return NextResponse.json(
      { error: "Hotel no encontrado." },
      { status: 404 }
    );
  }

  if (!module_) {
    return NextResponse.json(
      { error: "Módulo no encontrado." },
      { status: 404 }
    );
  }

  const hotelModule = await prisma.hotelModule.upsert({
    where: { hotelId_moduleId: { hotelId: params.id, moduleId } },
    update: { enabled },
    create: { hotelId: params.id, moduleId, enabled },
  });

  return NextResponse.json(hotelModule);
}
