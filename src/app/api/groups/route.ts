import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BED_ARRANGEMENTS } from "@/lib/bed-arrangement";
import { DOCUMENT_TYPES } from "@/lib/document-type";
import type { BedArrangement, DocumentType } from "@/generated/prisma/enums";

type MemberInput = {
  nombre: string;
  dni: string;
  documentType: DocumentType;
  roomId: string;
  disposicionCama: BedArrangement;
  esFree: boolean;
};

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user.hotelId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const hotelId = session.user.hotelId;
  const body = await request.json().catch(() => null);

  const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";
  const fechaEntradaRaw =
    typeof body?.fechaEntrada === "string" ? body.fechaEntrada : "";
  const fechaSalidaRaw =
    typeof body?.fechaSalida === "string" ? body.fechaSalida : "";
  const cantidadPersonas = Number(body?.cantidadPersonas);
  const membersRaw = Array.isArray(body?.members) ? body.members : [];

  if (
    !nombre ||
    !fechaEntradaRaw ||
    !fechaSalidaRaw ||
    !Number.isInteger(cantidadPersonas) ||
    cantidadPersonas <= 0 ||
    membersRaw.length === 0
  ) {
    return NextResponse.json(
      { error: "Completa todos los datos del grupo." },
      { status: 400 }
    );
  }

  const fechaEntrada = new Date(fechaEntradaRaw);
  const fechaSalida = new Date(fechaSalidaRaw);

  if (
    Number.isNaN(fechaEntrada.getTime()) ||
    Number.isNaN(fechaSalida.getTime()) ||
    fechaSalida <= fechaEntrada
  ) {
    return NextResponse.json({ error: "Fechas inválidas." }, { status: 400 });
  }

  const members: MemberInput[] = [];
  for (const raw of membersRaw) {
    const memberNombre = typeof raw?.nombre === "string" ? raw.nombre.trim() : "";
    const dni = typeof raw?.dni === "string" ? raw.dni.trim() : "";
    const documentType = raw?.documentType as DocumentType | undefined;
    const roomId = typeof raw?.roomId === "string" ? raw.roomId : "";
    const disposicionCama = raw?.disposicionCama as BedArrangement | undefined;
    const esFree = raw?.esFree === true;

    if (
      !memberNombre ||
      !dni ||
      !documentType ||
      !DOCUMENT_TYPES.includes(documentType) ||
      !roomId ||
      !disposicionCama ||
      !BED_ARRANGEMENTS.includes(disposicionCama)
    ) {
      return NextResponse.json(
        { error: "Hay integrantes con datos incompletos." },
        { status: 400 }
      );
    }

    members.push({
      nombre: memberNombre,
      dni,
      documentType,
      roomId,
      disposicionCama,
      esFree,
    });
  }

  const roomIds = Array.from(new Set(members.map((member) => member.roomId)));
  const rooms = await prisma.room.findMany({
    where: { id: { in: roomIds }, hotelId },
  });

  if (rooms.length !== roomIds.length) {
    return NextResponse.json(
      { error: "Alguna habitación seleccionada no es válida." },
      { status: 404 }
    );
  }

  const overlapping = await prisma.reservation.findMany({
    where: {
      hotelId,
      roomId: { in: roomIds },
      status: { in: ["PENDIENTE", "CONFIRMADA"] },
      checkIn: { lt: fechaSalida },
      checkOut: { gt: fechaEntrada },
    },
    include: { room: true },
  });

  if (overlapping.length > 0) {
    return NextResponse.json(
      {
        error: `La habitación ${overlapping[0].room.number} ya tiene una reserva en ese rango de fechas.`,
      },
      { status: 409 }
    );
  }

  const group = await prisma.$transaction(async (tx) => {
    const createdGroup = await tx.group.create({
      data: {
        nombre,
        fechaEntrada,
        fechaSalida,
        cantidadPersonas,
        hotelId,
      },
    });

    await Promise.all(
      members.map(async (member) => {
        const reservation = await tx.reservation.create({
          data: {
            guestName: member.nombre,
            dni: member.dni,
            documentType: member.documentType,
            checkIn: fechaEntrada,
            checkOut: fechaSalida,
            roomId: member.roomId,
            hotelId,
          },
        });

        await tx.groupMember.create({
          data: {
            nombre: member.nombre,
            dni: member.dni,
            documentType: member.documentType,
            esFree: member.esFree,
            disposicionCama: member.disposicionCama,
            groupId: createdGroup.id,
            roomId: member.roomId,
            reservationId: reservation.id,
          },
        });
      })
    );

    return tx.group.findUniqueOrThrow({
      where: { id: createdGroup.id },
      include: {
        members: { include: { room: true, reservation: true } },
      },
    });
  });

  return NextResponse.json(group);
}
