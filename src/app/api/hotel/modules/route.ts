import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user.hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const modules = await prisma.hotelModules.upsert({
    where: { hotelId: session.user.hotelId },
    update: {},
    create: { hotelId: session.user.hotelId },
  });

  return NextResponse.json(modules);
}
