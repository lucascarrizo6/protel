import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AfipConfigView } from "./afip-config-view";

export default async function ConfiguracionPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user.hotelId || session.user.role !== "HOTEL_ADMIN") {
    redirect("/dashboard");
  }

  const afipConfig = await prisma.afipConfig.findUnique({
    where: { hotelId: session.user.hotelId },
    select: {
      cuit: true,
      puntoVenta: true,
      tipoFacturaDefault: true,
      ambiente: true,
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Facturación AFIP
        </h1>
        <p className="text-sm text-muted-foreground">
          Configura tus credenciales de AFIP para emitir facturas electrónicas.
        </p>
      </div>

      <AfipConfigView initialConfig={afipConfig} />
    </div>
  );
}
