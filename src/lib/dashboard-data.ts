import { prisma } from "@/lib/prisma";
import { parseExtras, sumExtras } from "@/lib/reservation-extras";
import { guestProfileKey } from "@/lib/guest-profile";

const DAY_MS = 1000 * 60 * 60 * 24;

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export type ArrivalRow = {
  id: string;
  guestName: string;
  roomNumber: string;
  nights: number;
  amount: number;
  esFree: boolean;
  vip: boolean;
  vipMotivo: string | null;
  prefRecepcion: string | null;
  prefMucama: string | null;
  prefCocina: string | null;
};

export type DepartureRow = {
  id: string;
  guestName: string;
  roomNumber: string;
  checkOut: string;
  overdue: boolean;
  extrasTotal: number;
  vip: boolean;
};

export type StayRow = {
  id: string;
  guestName: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
};

export type DashboardData = {
  kpis: {
    roomsCount: number;
    activeReservations: number;
    pendingTasks: number;
    outstandingBalance: number;
  };
  tonight: { occupied: number; total: number; pct: number };
  adr: number;
  revpar: number;
  monthLabel: string;
  arrivals: ArrivalRow[];
  departures: DepartureRow[];
  inHouse: StayRow[];
  stayovers: StayRow[];
};

/** Noches del rango [checkIn, checkOut) que caen dentro de [from, to). */
function nightsInRange(checkIn: Date, checkOut: Date, from: Date, to: Date) {
  const start = Math.max(checkIn.getTime(), from.getTime());
  const end = Math.min(checkOut.getTime(), to.getTime());
  if (end <= start) return 0;
  return Math.round((end - start) / DAY_MS);
}

export function emptyDashboardData(): DashboardData {
  return {
    kpis: {
      roomsCount: 0,
      activeReservations: 0,
      pendingTasks: 0,
      outstandingBalance: 0,
    },
    tonight: { occupied: 0, total: 0, pct: 0 },
    adr: 0,
    revpar: 0,
    monthLabel: MONTH_LABEL_FORMATTER.format(new Date()),
    arrivals: [],
    departures: [],
    inHouse: [],
    stayovers: [],
  };
}

export async function getDashboardData(hotelId: string): Promise<DashboardData> {
  const now = new Date();

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const startOfTomorrow = new Date(startOfToday.getTime() + DAY_MS);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    roomsCount,
    activeReservations,
    pendingTasks,
    invoiceTotals,
    arrivalsRaw,
    departuresRaw,
    inHouseRaw,
    tonightRooms,
    monthReservations,
    guestProfiles,
  ] = await Promise.all([
    prisma.room.count({ where: { hotelId } }),
    prisma.reservation.count({
      where: { hotelId, status: { in: ["CONFIRMADA", "PENDIENTE"] } },
    }),
    prisma.housekeepingTask.count({ where: { hotelId, status: "PENDIENTE" } }),
    prisma.invoice.aggregate({
      where: { hotelId, status: "PENDIENTE" },
      _sum: { amount: true },
    }),
    prisma.reservation.findMany({
      where: { hotelId, status: "PENDIENTE", checkIn: { lte: endOfToday } },
      include: { room: true, groupMember: true },
      orderBy: { checkIn: "asc" },
    }),
    prisma.reservation.findMany({
      where: { hotelId, status: "CONFIRMADA", checkOut: { lte: endOfToday } },
      include: { room: true },
      orderBy: { checkOut: "asc" },
    }),
    prisma.reservation.findMany({
      where: { hotelId, status: "CONFIRMADA" },
      include: { room: true },
      orderBy: { checkOut: "asc" },
    }),
    prisma.reservation.findMany({
      where: {
        hotelId,
        status: { in: ["CONFIRMADA", "PENDIENTE"] },
        checkIn: { lte: endOfToday },
        checkOut: { gt: startOfToday },
      },
      select: { roomId: true },
    }),
    prisma.reservation.findMany({
      where: {
        hotelId,
        status: { in: ["CONFIRMADA", "COMPLETADA"] },
        checkIn: { lt: startOfTomorrow },
        checkOut: { gt: startOfMonth },
      },
      include: { room: true, groupMember: true },
    }),
    prisma.guestProfile.findMany({
      where: { hotelId },
      select: {
        dni: true,
        documentType: true,
        prefRecepcion: true,
        prefMucama: true,
        prefCocina: true,
        vip: true,
        vipMotivo: true,
      },
    }),
  ]);

  const profileByKey = new Map(
    guestProfiles.map((profile) => [
      guestProfileKey(profile.documentType, profile.dni),
      profile,
    ])
  );

  const arrivals: ArrivalRow[] = arrivalsRaw.map((reservation) => {
    const nights = Math.max(
      1,
      Math.round(
        (reservation.checkOut.getTime() - reservation.checkIn.getTime()) /
          DAY_MS
      )
    );
    const esFree = reservation.groupMember?.esFree ?? false;
    const profile = profileByKey.get(
      guestProfileKey(reservation.documentType, reservation.dni)
    );
    return {
      id: reservation.id,
      guestName: reservation.guestName,
      roomNumber: reservation.room.number,
      nights,
      amount: esFree ? 0 : nights * reservation.room.pricePerNight,
      esFree,
      vip: profile?.vip ?? false,
      vipMotivo: profile?.vipMotivo ?? null,
      prefRecepcion: profile?.prefRecepcion ?? null,
      prefMucama: profile?.prefMucama ?? null,
      prefCocina: profile?.prefCocina ?? null,
    };
  });

  const departures: DepartureRow[] = departuresRaw.map((reservation) => ({
    id: reservation.id,
    guestName: reservation.guestName,
    roomNumber: reservation.room.number,
    checkOut: reservation.checkOut.toISOString(),
    overdue: reservation.checkOut < startOfToday,
    extrasTotal: sumExtras(parseExtras(reservation.extras)),
    vip:
      profileByKey.get(
        guestProfileKey(reservation.documentType, reservation.dni)
      )?.vip ?? false,
  }));

  const inHouse: StayRow[] = inHouseRaw.map((reservation) => ({
    id: reservation.id,
    guestName: reservation.guestName,
    roomNumber: reservation.room.number,
    checkIn: reservation.checkIn.toISOString(),
    checkOut: reservation.checkOut.toISOString(),
  }));

  const stayovers = inHouse.filter(
    (stay) => new Date(stay.checkOut) > endOfToday
  );

  const occupied = new Set(tonightRooms.map((row) => row.roomId)).size;

  let roomNights = 0;
  let roomRevenue = 0;
  for (const reservation of monthReservations) {
    if (reservation.groupMember?.esFree) continue;
    const nights = nightsInRange(
      reservation.checkIn,
      reservation.checkOut,
      startOfMonth,
      startOfTomorrow
    );
    roomNights += nights;
    roomRevenue += nights * reservation.room.pricePerNight;
  }

  const daysElapsed = Math.max(
    1,
    Math.round((startOfTomorrow.getTime() - startOfMonth.getTime()) / DAY_MS)
  );

  return {
    kpis: {
      roomsCount,
      activeReservations,
      pendingTasks,
      outstandingBalance: invoiceTotals._sum.amount ?? 0,
    },
    tonight: {
      occupied,
      total: roomsCount,
      pct: roomsCount > 0 ? Math.round((occupied / roomsCount) * 100) : 0,
    },
    adr: roomNights > 0 ? roomRevenue / roomNights : 0,
    revpar: roomsCount > 0 ? roomRevenue / (roomsCount * daysElapsed) : 0,
    monthLabel: MONTH_LABEL_FORMATTER.format(now),
    arrivals,
    departures,
    inHouse,
    stayovers,
  };
}
