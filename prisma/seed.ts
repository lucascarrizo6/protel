import crypto from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

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
  documentType: "DNI" | "PASAPORTE";
  roomNumber: string;
  checkIn: Date;
  checkOut: Date;
  status: "PENDIENTE" | "CONFIRMADA" | "CANCELADA" | "COMPLETADA";
}[] = [
  {
    guestName: "Martín Gómez",
    dni: "30456789",
    documentType: "DNI",
    roomNumber: "101",
    checkIn: addDays(0),
    checkOut: addDays(2),
    status: "CONFIRMADA",
  },
  {
    guestName: "Lucía Fernández",
    dni: "28123456",
    documentType: "DNI",
    roomNumber: "102",
    checkIn: addDays(5),
    checkOut: addDays(8),
    status: "PENDIENTE",
  },
  {
    guestName: "Carlos Rodríguez",
    dni: "25987654",
    documentType: "DNI",
    roomNumber: "202",
    checkIn: addDays(-10),
    checkOut: addDays(-7),
    status: "COMPLETADA",
  },
  {
    guestName: "Sofía Martínez",
    dni: "33222111",
    documentType: "DNI",
    roomNumber: "203",
    checkIn: addDays(1),
    checkOut: addDays(3),
    status: "PENDIENTE",
  },
  {
    guestName: "Diego Álvarez",
    dni: "AB123456",
    documentType: "PASAPORTE",
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

async function main() {
// Nunca hardcodear contraseñas de las cuentas demo: se toman de env vars y,
  // si no están seteadas, se genera una al azar y se loguea una única vez
  // (es la única forma de recuperarla, ya que no queda en texto plano en ningún lado).
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? crypto.randomUUID();
  const superPassword = process.env.SEED_SUPER_PASSWORD ?? crypto.randomUUID();
  const mucamaPassword = process.env.SEED_MUCAMA_PASSWORD ?? crypto.randomUUID();
  const mantenimientoPassword = process.env.SEED_MANTENIMIENTO_PASSWORD ?? crypto.randomUUID();

  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log(`SEED_ADMIN_PASSWORD no está seteada. Contraseña generada para admin@protel.dev: ${adminPassword}`);
  }
  if (!process.env.SEED_SUPER_PASSWORD) {
    console.log(`SEED_SUPER_PASSWORD no está seteada. Contraseña generada para superadmin@protel.dev: ${superPassword}`);
  }
  if (!process.env.SEED_MUCAMA_PASSWORD) {
    console.log(`SEED_MUCAMA_PASSWORD no está seteada. Contraseña generada para mucama@protel.dev: ${mucamaPassword}`);
  }
  if (!process.env.SEED_MANTENIMIENTO_PASSWORD) {
    console.log(`SEED_MANTENIMIENTO_PASSWORD no está seteada. Contraseña generada para mantenimiento@protel.dev: ${mantenimientoPassword}`);
  }

  const adminPasswordHash = await hashPassword(adminPassword);
  const superPasswordHash = await hashPassword(superPassword);
  const mucamaPasswordHash = await hashPassword(mucamaPassword);
  const mantenimientoPasswordHash = await hashPassword(mantenimientoPassword);

  const hotel = await prisma.hotel.upsert({
    where: { slug: "hotel-demo" },
    update: { name: "Hotel Demo" },
    create: { name: "Hotel Demo", slug: "hotel-demo" },
  });

  await prisma.user.upsert({
    where: { email: "admin@protel.dev" },
    update: { name: "Usuario Administrador", passwordHash: adminPasswordHash },
    create: {
      name: "Usuario Administrador",
      email: "admin@protel.dev",
      passwordHash: adminPasswordHash,
      role: "HOTEL_ADMIN",
      hotelId: hotel.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "superadmin@protel.dev" },
    update: { name: "Super Administrador", passwordHash: superPasswordHash },
    create: {
      name: "Super Administrador",
      email: "superadmin@protel.dev",
      passwordHash: superPasswordHash,
      role: "SUPER_ADMIN",
      hotelId: null,
    },
  });

  // Nueva cuenta para Mucama
  await prisma.user.upsert({
    where: { email: "mucama@protel.dev" },
    update: { name: "Usuario Mucama", passwordHash: mucamaPasswordHash },
    create: {
      name: "Usuario Mucama",
      email: "mucama@protel.dev",
      passwordHash: mucamaPasswordHash,
      role: "HOUSEKEEPING",
      hotelId: hotel.id,
    },
  });

  // Nueva cuenta para Mantenimiento
  await prisma.user.upsert({
    where: { email: "mantenimiento@protel.dev" },
    update: { name: "Usuario Mantenimiento", passwordHash: mantenimientoPasswordHash },
    create: {
      name: "Usuario Mantenimiento",
      email: "mantenimiento@protel.dev",
      passwordHash: mantenimientoPasswordHash,
      role: "MAINTENANCE",
      hotelId: hotel.id,
    },
  });

  await prisma.hotelModules.upsert({
    where: { hotelId: hotel.id },
    update: {},
    create: { hotelId: hotel.id },
  });

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
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
