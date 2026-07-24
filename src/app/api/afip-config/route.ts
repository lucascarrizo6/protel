import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { TIPOS_FACTURA_AFIP, AFIP_AMBIENTES, isValidCuit } from "@/lib/afip-config";
import type { AfipAmbiente, TipoFacturaAfip } from "@/generated/prisma/enums";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user.hotelId || session.user.role !== "HOTEL_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  const cuit = typeof body?.cuit === "string" ? body.cuit.trim() : "";
  const certificado =
    typeof body?.certificado === "string" ? body.certificado.trim() : "";
  const clavePrivada =
    typeof body?.clavePrivada === "string" ? body.clavePrivada.trim() : "";
  const puntoVenta = Number(body?.puntoVenta);
  const tipoFacturaDefault = body?.tipoFacturaDefault as
    | TipoFacturaAfip
    | undefined;
  const ambiente = body?.ambiente as AfipAmbiente | undefined;

  if (
    !isValidCuit(cuit) ||
    !certificado ||
    !clavePrivada ||
    !Number.isInteger(puntoVenta) ||
    puntoVenta <= 0 ||
    !tipoFacturaDefault ||
    !TIPOS_FACTURA_AFIP.includes(tipoFacturaDefault) ||
    !ambiente ||
    !AFIP_AMBIENTES.includes(ambiente)
  ) {
    return NextResponse.json(
      { error: "Completa todos los datos correctamente." },
      { status: 400 }
    );
  }

  const afipConfig = await prisma.afipConfig.upsert({
    where: { hotelId: session.user.hotelId },
    update: {
      cuit,
      certificado: encrypt(certificado),
      clavePrivada: encrypt(clavePrivada),
      puntoVenta,
      tipoFacturaDefault,
      ambiente,
    },
    create: {
      cuit,
      certificado: encrypt(certificado),
      clavePrivada: encrypt(clavePrivada),
      puntoVenta,
      tipoFacturaDefault,
      ambiente,
      hotelId: session.user.hotelId,
    },
    select: {
      cuit: true,
      puntoVenta: true,
      tipoFacturaDefault: true,
      ambiente: true,
    },
  });

  return NextResponse.json(afipConfig);
}
