import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const loginAttempts = await prisma.loginAttempt.findMany({
    where: { exitoso: false },
    orderBy: { creadoEn: "desc" },
    take: 50,
  });

  return NextResponse.json(loginAttempts);
}
