import { NextResponse, type NextRequest } from "next/server";
import {
  MercadoPagoConfig,
  Payment,
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
} from "mercadopago";
import { confirmCheckInPayment } from "@/lib/confirm-checkin-payment";
import { prisma } from "@/lib/prisma";

const mercadoPagoClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

export async function POST(request: NextRequest) {
  const secret = process.env.MP_WEBHOOK_SECRET;

  if (!secret) {
    console.error("MercadoPago webhook error: MP_WEBHOOK_SECRET no está configurado.");
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    WebhookSignatureValidator.validate({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId: request.nextUrl.searchParams.get("data.id"),
      secret,
    });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      console.error("MercadoPago webhook: firma inválida.", error.reason);
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    throw error;
  }

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
      const reserva = await prisma.reservation.findUnique({
    where: { id: result.external_reference },
  });
  if (reserva?.roomId) {
    await confirmCheckInPayment(result.external_reference, "MERCADO_PAGO", reserva.roomId);
  }
}
  } catch (error) {
    console.error("MercadoPago webhook error:", error);
  }

  // MercadoPago reintenta la notificación si no recibe 200, así que
  // siempre se responde OK (una vez validada la firma) aunque algo
  // haya fallado al procesar el pago.
  return NextResponse.json({ received: true }, { status: 200 });
}
