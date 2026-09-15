"use client";

import { useCallback, useState } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { CreateInvoiceDialog } from "./create-invoice-dialog";
import { InvoicesTable } from "./invoices-table";

export type ReservationWithRoom = Prisma.ReservationGetPayload<{
  select: {
    id: true;
    guestName: true;
    checkIn: true;
    checkOut: true;
    roomId: true;
    room: { select: { number: true } };
  };
}>;

export type InvoiceWithReservation = Prisma.InvoiceGetPayload<{
  select: {
    id: true;
    amount: true;
    status: true;
    type: true;
    paymentMethod: true;
    reservation: {
      select: {
        guestName: true;
        checkIn: true;
        checkOut: true;
        room: { select: { number: true } };
      };
    };
  };
}>;

export function InvoicesView({
  initialInvoices,
  reservations,
}: {
  initialInvoices: InvoiceWithReservation[];
  reservations: ReservationWithRoom[];
}) {
  const [invoices, setInvoices] = useState(initialInvoices);

  const handleCreated = useCallback((invoice: InvoiceWithReservation) => {
    setInvoices((prev) => [invoice, ...prev]);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <CreateInvoiceDialog reservations={reservations} onCreated={handleCreated} />
      </div>

      <InvoicesTable invoices={invoices} />
    </div>
  );
}
