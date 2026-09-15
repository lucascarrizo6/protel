"use client";

import { memo } from "react";
import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
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
import { formatDocument } from "@/lib/document-type";
import type { GuestRowDTO } from "./guests-view";

type GuestsTableProps = {
  guests: GuestRowDTO[];
  onSelect: (guest: GuestRowDTO) => void;
};

function GuestsTableImpl({ guests, onSelect }: GuestsTableProps) {
  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Documento</TableHead>
            <TableHead>Estadías totales</TableHead>
            <TableHead>Última visita</TableHead>
            <TableHead>Total gastado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {guests.map((guest) => (
            <TableRow
              key={`${guest.documentType}:${guest.dni}`}
              className="cursor-pointer"
              onClick={() => onSelect(guest)}
            >
              <TableCell className="font-medium">
                {guest.profile?.vip ? (
                  <Star
                    className="mr-1 inline size-3.5 -translate-y-px fill-amber-400 text-amber-400"
                    aria-label="VIP"
                  />
                ) : null}
                {guest.name}
              </TableCell>
              <TableCell>
                {formatDocument(guest.documentType, guest.dni)}
              </TableCell>
              <TableCell>{guest.totalStays}</TableCell>
              <TableCell>{formatDate(new Date(guest.lastVisit))}</TableCell>
              <TableCell>{formatCurrency(guest.totalSpent)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

export const GuestsTable = memo(GuestsTableImpl);
