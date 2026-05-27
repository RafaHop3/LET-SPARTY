import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentClient } from "@/lib/mercadopago";
import { TicketStatus } from "@prisma/client";
import crypto from "crypto";

// ─── POST /api/webhooks/mercadopago ────────────────────────────
// Recebe notificações do MercadoPago sobre status de pagamentos
export async function POST(req: Request) {
  try {
    const body = await req.text();
    const data = JSON.parse(body);

    // Validar assinatura do webhook (segurança)
    const webhookSecret = process.env.MP_WEBHOOK_SECRET;
    if (webhookSecret) {
      const xSignature = req.headers.get("x-signature");
      const xRequestId = req.headers.get("x-request-id");

      if (xSignature && xRequestId) {
        const parts = xSignature.split(",");
        let ts = "";
        let hash = "";
        parts.forEach((part) => {
          const [key, value] = part.split("=");
          if (key.trim() === "ts") ts = value;
          if (key.trim() === "v1") hash = value;
        });

        const manifest = `id:${data.data?.id};request-id:${xRequestId};ts:${ts};`;
        const expectedHash = crypto
          .createHmac("sha256", webhookSecret)
          .update(manifest)
          .digest("hex");

        if (hash !== expectedHash) {
          console.warn("[MP Webhook] Assinatura inválida");
          return NextResponse.json(
            { error: "Assinatura inválida" },
            { status: 401 }
          );
        }
      }
    }

    // Processar apenas eventos de pagamento
    if (data.type !== "payment") {
      return NextResponse.json({ received: true });
    }

    const paymentId = data.data?.id;
    if (!paymentId) {
      return NextResponse.json({ received: true });
    }

    // Buscar detalhes do pagamento no MP
    const payment = await paymentClient.get({ id: paymentId });

    const externalReference = payment.external_reference; // = ticket.id
    const status = payment.status; // approved | rejected | pending | cancelled

    if (!externalReference) {
      return NextResponse.json({ received: true });
    }

    // Mapear status do MP para status do ticket
    const ticketStatusMap: Record<string, string> = {
      approved: "APPROVED",
      rejected: "REJECTED",
      cancelled: "CANCELLED",
      pending: "PENDING",
      in_process: "PENDING",
      in_mediation: "PENDING",
      charged_back: "CANCELLED",
      refunded: "CANCELLED",
    };

    const ticketStatus = ticketStatusMap[status || ""] || "PENDING";

    // Atualizar o ticket no banco
    await prisma.ticket.update({
      where: { id: externalReference },
      data: {
        status: ticketStatus as TicketStatus,
        mpPaymentId: String(paymentId),
      },
    });

    console.log(
      `[MP Webhook] Ticket ${externalReference} → ${ticketStatus} (payment: ${paymentId})`
    );

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[POST /api/webhooks/mercadopago]", error);
    // Sempre retornar 200 para o MP não reenviar
    return NextResponse.json({ received: true });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
