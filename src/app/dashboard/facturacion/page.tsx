import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InvoicesView } from "./invoices-view";

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Facturación</h1>
        <p className="text-sm text-muted-foreground">
          Revisa facturas, pagos y saldos pendientes.
        </p>
      </div>

      <InvoicesView initialInvoices={invoices} reservations={reservations} />
    </div>
  );
}
