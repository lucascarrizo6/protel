import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CalendarView } from "./calendar-view";

export default async function CalendarioPage() {
  const session = await getServerSession(authOptions);
  const hotelId = session?.user.hotelId;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const initialMonth = `${monthStart.getFullYear()}-${String(
    monthStart.getMonth() + 1
  ).padStart(2, "0")}`;

  const [rooms, reservations] = hotelId
    ? await Promise.all([
        prisma.room.findMany({
          where: { hotelId },
          orderBy: [{ floor: "asc" }, { number: "asc" }],
        }),
        prisma.reservation.findMany({
          where: {
            hotelId,
            status: { not: "CANCELADA" },
            checkIn: { lt: monthEnd },
            checkOut: { gt: monthStart },
          },
          include: { room: true },
          orderBy: { checkIn: "asc" },
        }),
      ])
    : [[], []];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Calendario</h1>
        <p className="text-sm text-muted-foreground">
          Vista mensual de check-ins, check-outs y ocupación por habitación.
        </p>
      </div>

      <CalendarView
        rooms={rooms}
        initialReservations={reservations}
        initialMonth={initialMonth}
      />
    </div>
  );
}
