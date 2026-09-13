import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BILLING_STATUSES } from "@/lib/super-admin";
import type { BillingStatus } from "@/generated/prisma/enums";

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function cleanDate(value: unknown): Date | null {
  const str = clean(value);
  if (!str) return null;
  const date = new Date(`${str}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const hotel = await prisma.hotel.findUnique({ where: { id: params.id } });
  if (!hotel) {
    return NextResponse.json(
      { error: "Hotel no encontrado." },
      { status: 404 }
    );
  }

  const billing = await prisma.hotelBilling.upsert({
    where: { hotelId: params.id },
    update: {},
    create: { hotelId: params.id },
  });

  return NextResponse.json(billing);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const hotel = await prisma.hotel.findUnique({ where: { id: params.id } });
  if (!hotel) {
    return NextResponse.json(
      { error: "Hotel no encontrado." },
      { status: 404 }
    );
  }

  const body = await request.json().catch(() => null);

  // "Marcar pagado" es un atajo: pone el estado al día, registra el pago de
  // hoy y adelanta un mes el próximo vencimiento (a partir de la fecha
  // anterior si había una, o de hoy si no).
  if (body?.action === "marcar_pagado") {
    const existing = await prisma.hotelBilling.findUnique({
      where: { hotelId: params.id },
    });
    const base = existing?.proximoVencimiento ?? new Date();
    const proximoVencimiento = new Date(base);
    // setUTCMonth (no setMonth): si usamos hora local, una fecha guardada
    // como medianoche UTC puede caer en el día anterior según el huso
    // horario del servidor y correr el vencimiento un día (el bug de
    // "día anterior" que ya conocemos en este proyecto).
    proximoVencimiento.setUTCMonth(proximoVencimiento.getUTCMonth() + 1);

    const billing = await prisma.hotelBilling.upsert({
      where: { hotelId: params.id },
      update: { status: "AL_DIA", ultimoPago: new Date(), proximoVencimiento },
      create: {
        hotelId: params.id,
        status: "AL_DIA",
        ultimoPago: new Date(),
        proximoVencimiento,
      },
    });

    return NextResponse.json(billing);
  }

  const status = body?.status as BillingStatus | undefined;
  if (status && !BILLING_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }

  const montoRaw = body?.monto;
  const monto =
    montoRaw === null || montoRaw === undefined || montoRaw === ""
      ? null
      : Number(montoRaw);
  if (monto !== null && !Number.isFinite(monto)) {
    return NextResponse.json({ error: "Monto inválido." }, { status: 400 });
  }

  const billing = await prisma.hotelBilling.upsert({
    where: { hotelId: params.id },
    update: {
      plan: clean(body?.plan),
      monto,
      status: status ?? undefined,
      proximoVencimiento: cleanDate(body?.proximoVencimiento),
      notas: clean(body?.notas),
    },
    create: {
      hotelId: params.id,
      plan: clean(body?.plan),
      monto,
      status: status ?? "PENDIENTE",
      proximoVencimiento: cleanDate(body?.proximoVencimiento),
      notas: clean(body?.notas),
    },
  });

  return NextResponse.json(billing);
}
