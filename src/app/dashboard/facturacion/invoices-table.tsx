"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
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
import {
  formatInvoiceStatus,
  invoiceStatusBadgeClassName,
} from "@/lib/invoice-status";
import {
  formatInvoiceType,
  invoiceTypeBadgeClassName,
} from "@/lib/invoice-type";
import { formatPaymentMethod } from "@/lib/payment-method";
import type { InvoiceWithReservation } from "./invoices-view";

type InvoicesTableProps = {
  invoices: InvoiceWithReservation[];
};

function InvoicesTableImpl({ invoices }: InvoicesTableProps) {
  if (invoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aún no hay facturas</CardTitle>
          <CardDescription>
            Las facturas de tu hotel aparecerán aquí una vez que se agreguen.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Huésped</TableHead>
            <TableHead>Habitación</TableHead>
            <TableHead>Check-in</TableHead>
            <TableHead>Check-out</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Método de pago</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-medium">
                {invoice.reservation.guestName}
              </TableCell>
              <TableCell>{invoice.reservation.room?.number ?? "—"}</TableCell>
              <TableCell>
                {formatDate(new Date(invoice.reservation.checkIn))}
              </TableCell>
              <TableCell>
                {formatDate(new Date(invoice.reservation.checkOut))}
              </TableCell>
              <TableCell>
                <Badge className={invoiceTypeBadgeClassName(invoice.type)}>
                  {formatInvoiceType(invoice.type)}
                </Badge>
              </TableCell>
              <TableCell>{formatCurrency(invoice.amount)}</TableCell>
              <TableCell>
                {invoice.paymentMethod
                  ? formatPaymentMethod(invoice.paymentMethod)
                  : "—"}
              </TableCell>
              <TableCell>
                <Badge className={invoiceStatusBadgeClassName(invoice.status)}>
                  {formatInvoiceStatus(invoice.status)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

export const InvoicesTable = memo(InvoicesTableImpl);
