import { BookingWizard } from "./booking-wizard";

export default function ReservarPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { embed?: string; pago?: string };
}) {
  return (
    <BookingWizard
      slug={params.slug}
      isEmbed={searchParams?.embed === "true"}
      paymentStatus={searchParams?.pago ?? null}
    />
  );
}
