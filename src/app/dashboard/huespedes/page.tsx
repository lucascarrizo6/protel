import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { guestProfileKey, type GuestProfileDTO } from "@/lib/guest-profile";
import type { DocumentType } from "@/generated/prisma/enums";
import { GuestsView, type GuestRowDTO } from "./guests-view";

type GuestRow = {
  dni: string;
  documentType: DocumentType;
  name: string;
  totalStays: number;
  lastVisit: Date;
  totalSpent: number;
};

export default async function HuespedesPage() {
  const session = await getServerSession(authOptions);
  const hotelId = session?.user.hotelId;

  // Agrupado por DNI+tipo de documento en la propia query (CTE + DISTINCT ON)
  // en vez de traer todas las reservas con todas sus facturas y agregar en JS.
  const [guestRows, profiles] = hotelId
    ? await Promise.all([
        prisma.$queryRaw<GuestRow[]>`
          WITH guest_stats AS (
            SELECT
              r."dni" AS "dni",
              r."documentType" AS "documentType",
              COUNT(*)::int AS "totalStays",
              MAX(r."checkOut") AS "lastVisit",
              COALESCE(SUM(i."amount") FILTER (WHERE i."status" = 'PAGADA'), 0) AS "totalSpent"
            FROM "Reservation" r
            LEFT JOIN "Invoice" i ON i."reservationId" = r."id"
            WHERE r."hotelId" = ${hotelId}
            GROUP BY r."dni", r."documentType"
          )
          SELECT DISTINCT ON (gs."dni", gs."documentType")
            gs."dni" AS "dni",
            gs."documentType" AS "documentType",
            gs."totalStays" AS "totalStays",
            gs."lastVisit" AS "lastVisit",
            gs."totalSpent" AS "totalSpent",
            r."guestName" AS "name"
          FROM guest_stats gs
          JOIN "Reservation" r
            ON r."dni" = gs."dni"
            AND r."documentType" = gs."documentType"
            AND r."checkOut" = gs."lastVisit"
            AND r."hotelId" = ${hotelId}
          ORDER BY gs."dni", gs."documentType", r."checkOut" DESC, r."id" DESC
        `,
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
      ])
    : [[], []];

  const profileByKey = new Map(
    (profiles as GuestProfileDTO[]).map((profile) => [
      guestProfileKey(profile.documentType, profile.dni),
      profile,
    ])
  );

  const guests: GuestRowDTO[] = guestRows
    .map((row) => ({
      dni: row.dni,
      documentType: row.documentType,
      name: row.name,
      totalStays: Number(row.totalStays),
      lastVisit: new Date(row.lastVisit).toISOString(),
      totalSpent: Number(row.totalSpent ?? 0),
      profile: profileByKey.get(guestProfileKey(row.documentType, row.dni)) ?? null,
    }))
    .sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Huéspedes</h1>
        <p className="text-sm text-muted-foreground">
          Historial de huéspedes que se han alojado en tu hotel. Tocá una fila
          para ver y editar sus preferencias.
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
        <GuestsView guests={guests} />
      )}
    </div>
  );
}
