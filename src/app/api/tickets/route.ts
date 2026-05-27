import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { preferenceClient, calculateSplit } from "@/lib/mercadopago";

// ─── POST /api/tickets ─────────────────────────────────────────
// Inicia a compra de um ingresso e cria preferência no MercadoPago ou Simulação
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { eventId, couponCode, email, name } = body;

    let userId = (session?.user as any)?.id;
    let userEmail = session?.user?.email;
    let userName = session?.user?.name;
    const isLoggedIn = !!userId;

    // Protocolo de Login Opcional: Se não logado, requer email/nome para checkout de visitante
    if (!userId) {
      if (!email || !name) {
        return NextResponse.json(
          { error: "É necessário estar logado ou informar E-mail e Nome para finalizar a compra" },
          { status: 400 }
        );
      }

      // Upsert do usuário convidado no banco
      const guestUser = await prisma.user.upsert({
        where: { email: email.trim().toLowerCase() },
        update: { name: name.trim() },
        create: {
          email: email.trim().toLowerCase(),
          name: name.trim(),
          role: "FESTEIRO",
          festeiroProfile: {
            create: {
              phone: "",
              cpf: `GUEST-TICKET-${Date.now()}`,
            },
          },
        },
      });

      userId = guestUser.id;
      userEmail = guestUser.email;
      userName = guestUser.name;
    }

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

    // Verificar se o usuário já tem ingresso aprovado e verificado
    const existingTicket = await prisma.ticket.findFirst({
      where: { eventId, userId, status: "APPROVED", isVerified: true },
    });
    if (existingTicket) {
      return NextResponse.json(
        { error: "Você já possui um ingresso ativo e verificado para este evento" },
        { status: 400 }
      );
    }

    // --- PROCESSAMENTO DE CUPOM ---
    let finalPrice = event.price;
    let discountAmount = 0;
    let couponId: string | null = null;

    if (couponCode && couponCode.trim()) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.trim().toUpperCase() },
      });

      if (coupon && coupon.isActive && coupon.usedCount < coupon.maxUses) {
        discountAmount = parseFloat(((event.price * coupon.discountPercent) / 100).toFixed(2));
        finalPrice = Math.max(0, parseFloat((event.price - discountAmount).toFixed(2)));
        couponId = coupon.id;

        // Atualizar contagem de uso do cupom
        await prisma.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    // Calcular split: 10% plataforma / 90% produtor baseado no preço final
    const { platformFee, producerAmount } = calculateSplit(finalPrice);

    // --- SEGURANÇA E PROVA DE PROPRIEDADE (OTP / MAGIC LINK PARA VISITANTES) ---
    // Se for guest checkout, geramos um código de verificação OTP de 6 dígitos
    const isVerified = isLoggedIn; // Autenticados são auto-verificados
    const verificationCode = isLoggedIn 
      ? null 
      : String(Math.floor(100000 + Math.random() * 900000)); // 6-digit OTP

    // --- PROTOCOLO DE TESTE / COMPRA SIMULADA ---
    // Se MP_ACCESS_TOKEN não está definido, fazemos compra instantânea simulada para desenvolvimento
    const mpAccessToken = process.env.MP_ACCESS_TOKEN;
    if (!mpAccessToken || mpAccessToken.trim() === "" || mpAccessToken.includes("YOUR") || mpAccessToken.includes("sb_publishable")) {
      
      // ⚠️ BLOQUEIO ESTRITO EM PRODUÇÃO: O Fallback Sandbox NUNCA pode ser executado em produção
      if (process.env.NODE_ENV === "production") {
        console.error("[CRITICAL CONFIG ERROR] MercadoPago Access Token está ausente no ambiente de PRODUÇÃO!");
        return NextResponse.json(
          { error: "Erro crítico de configuração do servidor" },
          { status: 500 }
        );
      }
      
      const ticket = await prisma.ticket.create({
        data: {
          eventId,
          userId,
          status: "APPROVED", // Auto-aprova para fluidez de teste sem chaves
          amount: finalPrice,
          platformFee,
          producerAmount,
          couponId,
          discountAmount,
          mpPaymentId: `SIMULADO-${Date.now()}`,
          mpPreferenceId: "SIMULADO-PREF",
          isVerified,
          verificationCode,
        },
      });

      return NextResponse.json(
        {
          message: "Compra simulada com sucesso! (Modo Desenvolvimento)",
          simulated: true,
          ticketId: ticket.id,
          amount: finalPrice,
          discountAmount,
          platformFee,
          producerAmount,
          status: "APPROVED",
          isVerified,
          verificationCode, // Retornamos para poder ser exibido no toast do frontend para testes
        },
        { status: 201 }
      );
    }

    // --- FLUXO INTEGRADO REAL MERCADOPAGO ---
    // Criar ticket pendente no banco
    const ticket = await prisma.ticket.create({
      data: {
        eventId,
        userId,
        status: "PENDING",
        amount: finalPrice,
        platformFee,
        producerAmount,
        couponId,
        discountAmount,
        isVerified,
        verificationCode,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const preference = await preferenceClient.create({
      body: {
        items: [
          {
            id: ticket.id,
            title: `Ingresso — ${event.title}`,
            description: `${event.venue} • ${new Date(event.date).toLocaleDateString("pt-BR")}`,
            quantity: 1,
            unit_price: finalPrice,
            currency_id: "BRL",
          },
        ],
        payer: {
          name: userName || "Festeiro Convidado",
          email: userEmail || "convidado@letsparty.com",
        },
        marketplace_fee: platformFee,
        back_urls: {
          success: `${baseUrl}/tickets/success?ticketId=${ticket.id}`,
          failure: `${baseUrl}/tickets/failure?ticketId=${ticket.id}`,
          pending: `${baseUrl}/tickets/pending?ticketId=${ticket.id}`,
        },
        auto_return: "approved",
        notification_url: `${baseUrl}/api/webhooks/mercadopago`,
        external_reference: ticket.id,
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
        checkoutUrl: preference.init_point,
        sandboxCheckoutUrl: preference.sandbox_init_point,
        amount: finalPrice,
        discountAmount,
        platformFee,
        producerAmount,
        isVerified,
        verificationCode,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/tickets] Erro crítico:", error);
    return NextResponse.json(
      { error: "Erro de processamento interno no servidor" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
