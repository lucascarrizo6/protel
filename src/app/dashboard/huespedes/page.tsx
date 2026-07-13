import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format-date";
import { formatCurrency } from "@/lib/format-currency";

type GuestSummary = {
  dni: string;
  name: string;
  totalStays: number;
  lastVisit: Date;
  totalSpent: number;
};

export default async function HuespedesPage() {
  const session = await getServerSession(authOptions);
  const hotelId = session?.user.hotelId;

  const reservations = hotelId
    ? await prisma.reservation.findMany({
        where: { hotelId },
        include: { invoices: true },
        orderBy: { checkOut: "desc" },
      })
    : [];

  const guestsByDni = new Map<string, GuestSummary>();

  for (const reservation of reservations) {
    const paidAmount = reservation.invoices
      .filter((invoice) => invoice.status === "PAGADA")
      .reduce((sum, invoice) => sum + invoice.amount, 0);

    const existing = guestsByDni.get(reservation.dni);

    if (existing) {
      existing.totalStays += 1;
      existing.totalSpent += paidAmount;
      if (reservation.checkOut > existing.lastVisit) {
        existing.lastVisit = reservation.checkOut;
        existing.name = reservation.guestName;
      }
    } else {
      guestsByDni.set(reservation.dni, {
        dni: reservation.dni,
        name: reservation.guestName,
        totalStays: 1,
        lastVisit: reservation.checkOut,
        totalSpent: paidAmount,
      });
    }
  }

  const guests = Array.from(guestsByDni.values()).sort(
    (a, b) => b.lastVisit.getTime() - a.lastVisit.getTime()
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Huéspedes</h1>
        <p className="text-sm text-muted-foreground">
          Historial de huéspedes que se han alojado en tu hotel.
        </p>
      </div>

      {guests.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aún no hay huéspedes</CardTitle>
            <CardDescription>
              Los huéspedes aparecerán aquí una vez que se registren reservas.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Estadías totales</TableHead>
                <TableHead>Última visita</TableHead>
                <TableHead>Total gastado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guests.map((guest) => (
                <TableRow key={guest.dni}>
                  <TableCell className="font-medium">{guest.name}</TableCell>
                  <TableCell>{guest.dni}</TableCell>
                  <TableCell>{guest.totalStays}</TableCell>
                  <TableCell>{formatDate(guest.lastVisit)}</TableCell>
                  <TableCell>{formatCurrency(guest.totalSpent)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
