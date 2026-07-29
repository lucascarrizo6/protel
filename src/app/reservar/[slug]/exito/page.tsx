import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookingHeader } from "../booking-header";

export default function ReservaExitoPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { embed?: string };
}) {
  const isEmbed = searchParams?.embed === "true";

  return (
    <div className="flex min-h-screen flex-col bg-[#f0ede8]">
      {!isEmbed && <BookingHeader hotelName="Protel" />}

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-green-100 text-2xl">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-[#111]">
          ¡Reserva confirmada!
        </h1>
        <p className="text-sm text-muted-foreground">
          Recibirás un email con los detalles.
        </p>
        <Button
          render={
            <Link
              href={`/reservar/${params.slug}${isEmbed ? "?embed=true" : ""}`}
            />
          }
          className="mt-2 font-bold text-white hover:opacity-90"
          style={{ backgroundColor: "#0047CC" }}
        >
          Volver al inicio
        </Button>
      </div>
    </div>
  );
}
