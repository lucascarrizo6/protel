import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InvoicesView } from "./invoices-view";
import type { ComponentProps } from "react";

export default async function FacturacionPage() {
  const session = await getServerSession(authOptions);

  const [invoices, reservations] = session?.user.hotelId
    ? await Promise.all([
        prisma.invoice.findMany({
          where: { hotelId: session.user.hotelId },
          include: { reservation: { include: { room: true } } },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
        prisma.reservation.findMany({
          where: { hotelId: session.user.hotelId },
          include: { room: true },
          orderBy: { checkIn: "asc" },
        }),
      ])
    : [[], []];

  // Magia de TypeScript: forzamos el tipo exacto sin usar "any"
  const validReservations = reservations.filter(
    (res) => res.roomId !== null && res.room !== null
  ) as unknown as ComponentProps<typeof InvoicesView>["reservations"];

  const validInvoices = invoices as unknown as ComponentProps<typeof InvoicesView>["initialInvoices"];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Facturación</h1>
        <p className="text-sm text-muted-foreground">
          Revisa facturas, pagos y saldos pendientes.
        </p>
      </div>

      <InvoicesView 
        initialInvoices={validInvoices} 
        reservations={validReservations} 
      />
    </div>
  );
}
