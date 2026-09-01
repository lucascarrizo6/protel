-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'HOTEL_ADMIN', 'RECEPTIONIST', 'HOUSEKEEPING');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'BLOCKED', 'CLEANING', 'MANTENIMIENTO');

-- CreateEnum
CREATE TYPE "BedArrangement" AS ENUM ('SIMPLE', 'DOBLE', 'TWIN', 'TRIPLE', 'FAMILIAR');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'COMPLETADA');

-- CreateEnum
CREATE TYPE "HousekeepingStatus" AS ENUM ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADA');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDIENTE', 'PAGADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('ALOJAMIENTO', 'CONSUMOS');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('DNI', 'PASAPORTE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('EFECTIVO', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'TRANSFERENCIA', 'MERCADO_PAGO');

-- CreateEnum
CREATE TYPE "TipoFacturaAfip" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "AfipAmbiente" AS ENUM ('SANDBOX', 'PRODUCCION');

-- CreateTable
CREATE TABLE "Hotel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hotel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'RECEPTIONIST',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hotelId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 2,
    "pricePerNight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hotelId" TEXT NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HousekeepingTask" (
    "id" TEXT NOT NULL,
    "status" "HousekeepingStatus" NOT NULL DEFAULT 'PENDIENTE',
    "limpiadaHoy" BOOLEAN NOT NULL DEFAULT false,
    "priority" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "assignedToId" TEXT,

    CONSTRAINT "HousekeepingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL DEFAULT 'DNI',
    "email" TEXT,
    "phone" TEXT,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDIENTE',
    "extras" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hotelId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDIENTE',
    "type" "InvoiceType" NOT NULL DEFAULT 'ALOJAMIENTO',
    "paymentMethod" "PaymentMethod",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hotelId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fechaEntrada" TIMESTAMP(3) NOT NULL,
    "fechaSalida" TIMESTAMP(3) NOT NULL,
    "cantidadPersonas" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hotelId" TEXT NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL DEFAULT 'DNI',
    "esFree" BOOLEAN NOT NULL DEFAULT false,
    "disposicionCama" "BedArrangement" NOT NULL,
    "groupId" TEXT NOT NULL,
    "roomId" TEXT,
    "reservationId" TEXT,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelModules" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "mercadopago" BOOLEAN NOT NULL DEFAULT true,
    "afip" BOOLEAN NOT NULL DEFAULT true,
    "grupos" BOOLEAN NOT NULL DEFAULT true,
    "mucama" BOOLEAN NOT NULL DEFAULT true,
    "calendario" BOOLEAN NOT NULL DEFAULT true,
    "reservas" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "HotelModules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AfipConfig" (
    "id" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "certificado" TEXT NOT NULL,
    "clavePrivada" TEXT NOT NULL,
    "puntoVenta" INTEGER NOT NULL,
    "tipoFacturaDefault" "TipoFacturaAfip" NOT NULL DEFAULT 'B',
    "ambiente" "AfipAmbiente" NOT NULL DEFAULT 'SANDBOX',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hotelId" TEXT NOT NULL,

    CONSTRAINT "AfipConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "exitoso" BOOLEAN NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hotel_slug_key" ON "Hotel"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_hotelId_idx" ON "User"("hotelId");

-- CreateIndex
CREATE INDEX "Room_hotelId_idx" ON "Room"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_hotelId_number_key" ON "Room"("hotelId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "HousekeepingTask_roomId_key" ON "HousekeepingTask"("roomId");

-- CreateIndex
CREATE INDEX "HousekeepingTask_hotelId_idx" ON "HousekeepingTask"("hotelId");

-- CreateIndex
CREATE INDEX "Reservation_hotelId_idx" ON "Reservation"("hotelId");

-- CreateIndex
CREATE INDEX "Reservation_roomId_idx" ON "Reservation"("roomId");

-- CreateIndex
CREATE INDEX "Reservation_hotelId_checkIn_idx" ON "Reservation"("hotelId", "checkIn");

-- CreateIndex
CREATE INDEX "Reservation_hotelId_status_idx" ON "Reservation"("hotelId", "status");

-- CreateIndex
CREATE INDEX "Invoice_hotelId_idx" ON "Invoice"("hotelId");

-- CreateIndex
CREATE INDEX "Invoice_reservationId_idx" ON "Invoice"("reservationId");

-- CreateIndex
CREATE INDEX "Invoice_hotelId_createdAt_idx" ON "Invoice"("hotelId", "createdAt");

-- CreateIndex
CREATE INDEX "Group_hotelId_idx" ON "Group"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_reservationId_key" ON "GroupMember"("reservationId");

-- CreateIndex
CREATE INDEX "GroupMember_groupId_idx" ON "GroupMember"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "HotelModules_hotelId_key" ON "HotelModules"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "AfipConfig_hotelId_key" ON "AfipConfig"("hotelId");

-- CreateIndex
CREATE INDEX "LoginAttempt_email_creadoEn_idx" ON "LoginAttempt"("email", "creadoEn");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HousekeepingTask" ADD CONSTRAINT "HousekeepingTask_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HousekeepingTask" ADD CONSTRAINT "HousekeepingTask_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HousekeepingTask" ADD CONSTRAINT "HousekeepingTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelModules" ADD CONSTRAINT "HotelModules_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AfipConfig" ADD CONSTRAINT "AfipConfig_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
