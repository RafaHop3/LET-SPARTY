import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { preferenceClient, calculateSplit } from "@/lib/mercadopago";

// ─── POST /api/tickets ─────────────────────────────────────────
// Inicia a compra de um ingresso e cria preferência no MercadoPago
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string; name?: string; email?: string };
    const body = await req.json();
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: "eventId é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar evento
    const event = await prisma.event.findUnique({
      where: { id: eventId, isActive: true },
      include: {
        produtora: {
          select: {
            name: true,
            produtoraProfile: { select: { companyName: true } },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Evento não encontrado ou inativo" },
        { status: 404 }
      );
    }

    // Verificar se o evento já passou
    if (new Date(event.date) < new Date()) {
      return NextResponse.json(
        { error: "Não é possível comprar ingressos para eventos passados" },
        { status: 400 }
      );
    }

    // Verificar se o usuário já tem ingresso aprovado
    const existingTicket = await prisma.ticket.findFirst({
      where: { eventId, userId: user.id, status: "APPROVED" },
    });
    if (existingTicket) {
      return NextResponse.json(
        { error: "Você já possui um ingresso para este evento" },
        { status: 400 }
      );
    }

    // Calcular split: 10% plataforma / 90% produtor
    const { platformFee, producerAmount } = calculateSplit(event.price);

    // Criar ticket pendente no banco
    const ticket = await prisma.ticket.create({
      data: {
        eventId,
        userId: user.id,
        status: "PENDING",
        amount: event.price,
        platformFee,
        producerAmount,
      },
    });

    // Criar preferência de pagamento no MercadoPago
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const preference = await preferenceClient.create({
      body: {
        items: [
          {
            id: ticket.id,
            title: `Ingresso — ${event.title}`,
            description: `${event.venue} • ${new Date(event.date).toLocaleDateString("pt-BR")}`,
            quantity: 1,
            unit_price: event.price,
            currency_id: "BRL",
          },
        ],
        payer: {
          name: user.name,
          email: user.email,
        },
        // Taxa da plataforma retida automaticamente
        marketplace_fee: platformFee,
        back_urls: {
          success: `${baseUrl}/tickets/success?ticketId=${ticket.id}`,
          failure: `${baseUrl}/tickets/failure?ticketId=${ticket.id}`,
          pending: `${baseUrl}/tickets/pending?ticketId=${ticket.id}`,
        },
        auto_return: "approved",
        notification_url: `${baseUrl}/api/webhooks/mercadopago`,
        external_reference: ticket.id,
        // Expiração: 30 minutos para completar o pagamento
        expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      },
    });

    // Salvar ID da preferência no ticket
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { mpPreferenceId: preference.id },
    });

    return NextResponse.json(
      {
        ticketId: ticket.id,
        preferenceId: preference.id,
        // init_point: URL do checkout MP (web)
        checkoutUrl: preference.init_point,
        // sandbox_init_point: para testes
        sandboxCheckoutUrl: preference.sandbox_init_point,
        amount: event.price,
        platformFee,
        producerAmount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/tickets]", error);
    return NextResponse.json(
      { error: "Erro ao criar ingresso" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
