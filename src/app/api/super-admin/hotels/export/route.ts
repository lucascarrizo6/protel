import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format-date";
import {
  BILLING_STATUS_LABELS,
  DEFAULT_HOTEL_MODULES,
  HOTEL_MODULE_KEYS,
  HOTEL_MODULE_LABELS,
} from "@/lib/super-admin";

// RFC 4180: todo entre comillas, comillas internas duplicadas. Así Excel no
// se confunde con nombres que traigan comas o comillas.
function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const hotels = await prisma.hotel.findMany({
    include: {
      modules: true,
      billing: true,
      _count: { select: { users: true } },
    },
    orderBy: { name: "asc" },
  });

  const header = [
    "Hotel",
    "Activo",
    "Plan",
    "Monto",
    "Estado facturación",
    "Próximo vencimiento",
    "Usuarios",
    ...HOTEL_MODULE_KEYS.map((key) => HOTEL_MODULE_LABELS[key]),
  ];

  const rows = hotels.map((hotel) => {
    const status = hotel.billing?.status ?? "PENDIENTE";
    return [
      hotel.name,
      hotel.active ? "Sí" : "No",
      hotel.billing?.plan ?? "",
      hotel.billing?.monto != null ? String(hotel.billing.monto) : "",
      BILLING_STATUS_LABELS[status],
      hotel.billing?.proximoVencimiento
        ? formatDate(hotel.billing.proximoVencimiento)
        : "",
      String(hotel._count.users),
      ...HOTEL_MODULE_KEYS.map((key) =>
        (hotel.modules?.[key] ?? DEFAULT_HOTEL_MODULES[key]) ? "Sí" : "No"
      ),
    ];
  });

  // BOM al principio: sin esto, Excel muestra mal las tildes y la "ñ".
  const csv =
    "﻿" +
    [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");

  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hoteles-hotar-${fecha}.csv"`,
    },
  });
}
