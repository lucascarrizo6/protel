import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DOCUMENT_TYPES } from "@/lib/document-type";
import type { DocumentType } from "@/generated/prisma/enums";

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user.hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const dni = request.nextUrl.searchParams.get("dni") ?? "";
  const tipo = (request.nextUrl.searchParams.get("tipo") ??
    "DNI") as DocumentType;

  if (!dni || !DOCUMENT_TYPES.includes(tipo)) {
    return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 });
  }

  const profile = await prisma.guestProfile.findUnique({
    where: {
      hotelId_documentType_dni: {
        hotelId: session.user.hotelId,
        documentType: tipo,
        dni,
      },
    },
  });

  return NextResponse.json(profile ?? null);
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user.hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const dni = clean(body?.dni);
  const documentType = (body?.documentType ?? "DNI") as DocumentType;

  if (!dni || !DOCUMENT_TYPES.includes(documentType)) {
    return NextResponse.json(
      { error: "Falta el documento del huésped." },
      { status: 400 }
    );
  }

  const vip = body?.vip === true;
  const data = {
    prefRecepcion: clean(body?.prefRecepcion),
    prefMucama: clean(body?.prefMucama),
    prefCocina: clean(body?.prefCocina),
    vip,
    vipMotivo: vip ? clean(body?.vipMotivo) : null,
  };

  const profile = await prisma.guestProfile.upsert({
    where: {
      hotelId_documentType_dni: {
        hotelId: session.user.hotelId,
        documentType,
        dni,
      },
    },
    update: data,
    create: {
      hotelId: session.user.hotelId,
      documentType,
      dni,
      ...data,
    },
  });

  return NextResponse.json(profile);
}
