import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "Demo1234!";

type RoomSeed = {
  number: string;
  floor: number;
  type: string;
  status: "AVAILABLE" | "OCCUPIED" | "BLOCKED" | "CLEANING";
  notes?: string;
};

const ROOM_TYPE_ROTATION = ["Individual", "Doble", "Suite", "Triple"] as const;

const ROOM_OVERRIDES: Record<string, Pick<RoomSeed, "status" | "notes">> = {
  "102": { status: "OCCUPIED" },
  "103": {
    status: "CLEANING",
    notes: "Limpieza profunda solicitada por mucama.",
  },
  "201": { status: "OCCUPIED" },
  "202": {
    status: "BLOCKED",
    notes: "En mantenimiento: reparación de aire acondicionado programada.",
  },
  "301": { status: "OCCUPIED" },
  "302": { status: "CLEANING" },
};

function buildRooms(): RoomSeed[] {
  const rooms: RoomSeed[] = [];

  for (let floor = 1; floor <= 3; floor++) {
    for (let index = 1; index <= 10; index++) {
      const number = `${floor}${String(index).padStart(2, "0")}`;
      const override = ROOM_OVERRIDES[number];
      rooms.push({
        number,
        floor,
        type: ROOM_TYPE_ROTATION[(index - 1) % ROOM_TYPE_ROTATION.length],
        status: override?.status ?? "AVAILABLE",
        notes: override?.notes,
      });
    }
  }

  return rooms;
}

const ROOMS = buildRooms();

function addDays(days: number): Date {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function monthsAgo(months: number): Date {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(15);
  date.setMonth(date.getMonth() - months);
  return date;
}

const RESERVATIONS: {
  guestName: string;
  dni: string;
  roomNumber: string;
  checkIn: Date;
  checkOut: Date;
  status: "PENDIENTE" | "CONFIRMADA" | "CANCELADA" | "COMPLETADA";
}[] = [
  {
    guestName: "Martín Gómez",
    dni: "30456789",
    roomNumber: "101",
    checkIn: addDays(0),
    checkOut: addDays(2),
    status: "CONFIRMADA",
  },
  {
    guestName: "Lucía Fernández",
    dni: "28123456",
    roomNumber: "102",
    checkIn: addDays(5),
    checkOut: addDays(8),
    status: "PENDIENTE",
  },
  {
    guestName: "Carlos Rodríguez",
    dni: "25987654",
    roomNumber: "202",
    checkIn: addDays(-10),
    checkOut: addDays(-7),
    status: "COMPLETADA",
  },
  {
    guestName: "Sofía Martínez",
    dni: "33222111",
    roomNumber: "203",
    checkIn: addDays(1),
    checkOut: addDays(3),
    status: "PENDIENTE",
  },
  {
    guestName: "Diego Álvarez",
    dni: "27888999",
    roomNumber: "301",
    checkIn: addDays(-3),
    checkOut: addDays(-1),
    status: "CANCELADA",
  },
];

const HOUSEKEEPING_TASKS: {
  roomNumber: string;
  status: "PENDIENTE" | "EN_PROGRESO" | "COMPLETADA";
  priority: boolean;
}[] = [
  { roomNumber: "101", status: "COMPLETADA", priority: false },
  { roomNumber: "103", status: "EN_PROGRESO", priority: true },
  { roomNumber: "201", status: "COMPLETADA", priority: false },
  { roomNumber: "202", status: "PENDIENTE", priority: true },
  { roomNumber: "302", status: "PENDIENTE", priority: false },
];

const INVOICES: {
  guestName: string;
  amount: number;
  status: "PENDIENTE" | "PAGADA" | "CANCELADA";
  createdAt: Date;
}[] = [
  { guestName: "Martín Gómez", amount: 20000, status: "PAGADA", createdAt: monthsAgo(3) },
  { guestName: "Carlos Rodríguez", amount: 60000, status: "PAGADA", createdAt: monthsAgo(3) },
  { guestName: "Carlos Rodríguez", amount: 38000, status: "PAGADA", createdAt: monthsAgo(2) },
  { guestName: "Lucía Fernández", amount: 15000, status: "PENDIENTE", createdAt: monthsAgo(2) },
  { guestName: "Diego Álvarez", amount: 75000, status: "CANCELADA", createdAt: monthsAgo(1) },
  { guestName: "Martín Gómez", amount: 25000, status: "PAGADA", createdAt: monthsAgo(1) },
  { guestName: "Lucía Fernández", amount: 37000, status: "PENDIENTE", createdAt: monthsAgo(0) },
  { guestName: "Sofía Martínez", amount: 30000, status: "PENDIENTE", createdAt: monthsAgo(0) },
];

const MODULES: {
  name: string;
  slug: string;
  description: string;
  icon: string;
}[] = [
  {
    name: "Reservas",
    slug: "reservas",
    description: "Gestión de reservas y huéspedes.",
    icon: "calendar-check",
  },
  {
    name: "Mucama",
    slug: "mucama",
    description: "Tareas de limpieza y disponibilidad de habitaciones.",
    icon: "sparkles",
  },
  {
    name: "Facturación",
    slug: "facturacion",
    description: "Facturas, pagos y saldos pendientes.",
    icon: "receipt",
  },
  {
    name: "Reportes",
    slug: "reportes",
    description: "Estadísticas y reportes de ocupación e ingresos.",
    icon: "bar-chart",
  },
  {
    name: "Huéspedes",
    slug: "huespedes",
    description: "CRM de huéspedes con historial de estadías.",
    icon: "users",
  },
];

async function main() {
  const demoPasswordHash = await hashPassword(DEMO_PASSWORD);

  const hotel = await prisma.hotel.upsert({
    where: { slug: "demo-hotel" },
    update: { name: "Hotel Demo" },
    create: { name: "Hotel Demo", slug: "demo-hotel" },
  });

  await prisma.user.upsert({
    where: { email: "admin@protel.dev" },
    update: { name: "Usuario Administrador", passwordHash: demoPasswordHash },
    create: {
      name: "Usuario Administrador",
      email: "admin@protel.dev",
      passwordHash: demoPasswordHash,
      role: "HOTEL_ADMIN",
      hotelId: hotel.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "superadmin@protel.dev" },
    update: { name: "Super Administrador", passwordHash: demoPasswordHash },
    create: {
      name: "Super Administrador",
      email: "superadmin@protel.dev",
      passwordHash: demoPasswordHash,
      role: "SUPER_ADMIN",
      hotelId: null,
    },
  });

  const modulesBySlug = new Map<string, string>();

  for (const module_ of MODULES) {
    const savedModule = await prisma.module.upsert({
      where: { slug: module_.slug },
      update: {
        name: module_.name,
        description: module_.description,
        icon: module_.icon,
      },
      create: module_,
    });
    modulesBySlug.set(module_.slug, savedModule.id);
  }

  console.log(`Se sembraron ${MODULES.length} módulos.`);

  const ENABLED_MODULES = [
    "reservas",
    "mucama",
    "facturacion",
    "reportes",
    "huespedes",
  ];

  for (const slug of MODULES.map((module_) => module_.slug)) {
    await prisma.hotelModule.upsert({
      where: {
        hotelId_moduleId: {
          hotelId: hotel.id,
          moduleId: modulesBySlug.get(slug)!,
        },
      },
      update: { enabled: ENABLED_MODULES.includes(slug) },
      create: {
        hotelId: hotel.id,
        moduleId: modulesBySlug.get(slug)!,
        enabled: ENABLED_MODULES.includes(slug),
      },
    });
  }

  console.log(`Se configuraron los módulos para ${hotel.name}.`);

  const roomsByNumber = new Map<string, string>();

  for (const room of ROOMS) {
    const savedRoom = await prisma.room.upsert({
      where: { hotelId_number: { hotelId: hotel.id, number: room.number } },
      update: { type: room.type, notes: room.notes ?? null },
      create: { ...room, hotelId: hotel.id },
    });
    roomsByNumber.set(room.number, savedRoom.id);
  }

  console.log(`Se sembraron ${ROOMS.length} habitaciones para ${hotel.name}.`);

  await prisma.invoice.deleteMany({ where: { hotelId: hotel.id } });
  await prisma.reservation.deleteMany({ where: { hotelId: hotel.id } });

  const reservationsByGuest = new Map<string, string>();

  for (const { roomNumber, ...reservation } of RESERVATIONS) {
    const savedReservation = await prisma.reservation.create({
      data: {
        ...reservation,
        hotelId: hotel.id,
        roomId: roomsByNumber.get(roomNumber)!,
      },
    });
    reservationsByGuest.set(reservation.guestName, savedReservation.id);
  }

  console.log(`Se sembraron ${RESERVATIONS.length} reservas para ${hotel.name}.`);

  for (const task of HOUSEKEEPING_TASKS) {
    const roomId = roomsByNumber.get(task.roomNumber)!;
    await prisma.housekeepingTask.upsert({
      where: { roomId },
      update: { status: task.status, priority: task.priority },
      create: {
        status: task.status,
        priority: task.priority,
        roomId,
        hotelId: hotel.id,
      },
    });
  }

  console.log(
    `Se sembraron ${HOUSEKEEPING_TASKS.length} tareas de limpieza para ${hotel.name}.`
  );

  for (const invoice of INVOICES) {
    await prisma.invoice.create({
      data: {
        amount: invoice.amount,
        status: invoice.status,
        createdAt: invoice.createdAt,
        reservationId: reservationsByGuest.get(invoice.guestName)!,
        hotelId: hotel.id,
      },
    });
  }

  console.log(`Se sembraron ${INVOICES.length} facturas para ${hotel.name}.`);
  console.log(`Contraseña de las cuentas de demostración: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
