import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getScopedHome } from "@/lib/staff-scope";
import { InvoicesView } from "./invoices-view";

export default async function FacturacionPage() {
  const session = await getServerSession(authOptions);

  const scopedHome = getScopedHome(session?.user.role);
  if (scopedHome) {
    redirect(scopedHome);
  }

  const [invoices, reservations] = session?.user.hotelId
    ? await Promise.all([
        prisma.invoice.findMany({
          where: { hotelId: session.user.hotelId },
          include: { reservation: { include: { room: true } } },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
        prisma.reservation.findMany({
          where: {
            hotelId: session.user.hotelId,
            // Solo reservas con habitación física ya asignada: no tiene
            // sentido facturar una reserva "flotante" que todavía no
            // pasó por el check-in.
            roomId: { not: null },
          },
          include: { room: true },
          orderBy: { checkIn: "asc" },
        }),
      ])
    : [[], []];

  const reservationsWithRoom = reservations.filter(
    (reservation): reservation is typeof reservation & {
      room: NonNullable<(typeof reservation)["room"]>;
    } => reservation.room !== null
  );

  // Defensivo: en la práctica una factura siempre se crea sobre una reserva
  // ya con habitación asignada, pero si alguna quedó huérfana no la mostramos
  // rota en vez de romper la pantalla entera.
  const invoicesWithRoom = invoices.filter(
    (invoice): invoice is typeof invoice & {
      reservation: typeof invoice.reservation & {
        room: NonNullable<(typeof invoice.reservation)["room"]>;
      };
    } => invoice.reservation.room !== null
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Facturación</h1>
        <p className="text-sm text-muted-foreground">
          Revisa facturas, pagos y saldos pendientes.
        </p>
      </div>

      <InvoicesView
        initialInvoices={invoicesWithRoom}
        reservations={reservationsWithRoom}
      />
    </div>
  );
}
