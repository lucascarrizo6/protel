import { NextResponse, type NextRequest } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { confirmCheckInPayment } from "@/lib/confirm-checkin-payment";

const mercadoPagoClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (body?.type !== "payment") {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const paymentId = body?.data?.id;

    if (!paymentId) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const payment = new Payment(mercadoPagoClient);
    const result = await payment.get({ id: paymentId });

    if (result.status === "approved" && result.external_reference) {
      await confirmCheckInPayment(result.external_reference, "MERCADO_PAGO");
    }
  } catch (error) {
    console.error("MercadoPago webhook error:", error);
  }

  // MercadoPago reintenta la notificación si no recibe 200, así que
  // siempre se responde OK aunque algo haya fallado internamente.
  return NextResponse.json({ received: true }, { status: 200 });
}
