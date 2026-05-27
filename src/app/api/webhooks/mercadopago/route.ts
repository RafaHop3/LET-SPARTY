import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentClient } from "@/lib/mercadopago";
import { TicketStatus } from "@prisma/client";
import crypto from "crypto";

// ─── POST /api/webhooks/mercadopago ────────────────────────────
// Recebe notificações do MercadoPago sobre status de pagamentos com verificação e idempotência
export async function POST(req: Request) {
  let webhookValidationFailed = false;

  try {
    const body = await req.text();
    const data = JSON.parse(body);

    // 1. Validar assinatura do webhook (Segurança Física)
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
          console.warn("[MP Webhook] Assinatura inválida detectada.");
          webhookValidationFailed = true;
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

    // 2. Garantia de Idempotência: Evita emissão dupla e processamento repetido
    const existingTicket = await prisma.ticket.findFirst({
      where: { mpPaymentId: String(paymentId) },
    });
    
    if (existingTicket && existingTicket.status === "APPROVED") {
      console.log(`[MP Webhook] Idempotência acionada: Pagamento ${paymentId} já processado.`);
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

    // 3. Atualizar o ticket no banco de forma transacional e avaliar elegibilidade de giros
    await prisma.$transaction(async (tx) => {
      const updatedTicket = await tx.ticket.update({
        where: { id: externalReference },
        data: {
          status: ticketStatus as TicketStatus,
          mpPaymentId: String(paymentId),
        },
      });

      // Se o pagamento foi aprovado, avalia concessão de giros da roleta
      if (ticketStatus === "APPROVED") {
        const uncountedTickets = await tx.ticket.findMany({
          where: {
            userId: updatedTicket.userId,
            status: "APPROVED",
            spinGranted: false,
          },
          select: { id: true }
        });

        if (uncountedTickets.length >= 2) {
          const pairsCount = Math.floor(uncountedTickets.length / 2);
          const spinsToGrant = pairsCount;
          const ticketIdsToMark = uncountedTickets.slice(0, pairsCount * 2).map((t: any) => t.id);

          // Incrementa saldo de giros
          await tx.user.update({
            where: { id: updatedTicket.userId },
            data: { availableSpins: { increment: spinsToGrant } }
          });

          // Marca estes ingressos como contabilizados
          await tx.ticket.updateMany({
            where: {
              id: { in: ticketIdsToMark }
            },
            data: {
              spinGranted: true
            }
          });

          console.log(`[Roleta Sparty] Webhook MP: Concedido ${spinsToGrant} giros para o usuário ${updatedTicket.userId} (tickets: ${ticketIdsToMark.join(", ")})`);
        }
      }
    });

    console.log(
      `[MP Webhook] Ticket ${externalReference} atualizado transacionalmente para ${ticketStatus} (pagamento: ${paymentId})`
    );

    return NextResponse.json({ received: true });
  } catch (error) {
    // Registra o log estruturado sem dados sensíveis de PII no console do servidor
    console.error("[POST /api/webhooks/mercadopago] Exceção crítica:", error);

    // Se falhou na validação de assinatura, já retornou 401. 
    if (webhookValidationFailed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Retorna erro 500 para falhas no banco/infra para ativar a fila de retentativas (Retry Pattern) do MercadoPago
    return NextResponse.json(
      { error: "Erro de processamento interno no servidor" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
