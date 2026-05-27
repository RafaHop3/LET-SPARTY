import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { preferenceClient, calculateSplit } from "@/lib/mercadopago";

// ─── HELPER PARA CONCESSÃO DE GIROS DA ROLETA ──────────────────
async function grantSpinsIfEligible(tx: any, userId: string) {
  const uncountedTickets = await tx.ticket.findMany({
    where: {
      userId: userId,
      status: "APPROVED",
      spinGranted: false,
    },
    select: { id: true }
  });

  if (uncountedTickets.length >= 2) {
    const pairsCount = Math.floor(uncountedTickets.length / 2);
    const spinsToGrant = pairsCount;
    const ticketIdsToMark = uncountedTickets.slice(0, pairsCount * 2).map((t: any) => t.id);

    await tx.user.update({
      where: { id: userId },
      data: { availableSpins: { increment: spinsToGrant } }
    });

    await tx.ticket.updateMany({
      where: {
        id: { in: ticketIdsToMark }
      },
      data: {
        spinGranted: true
      }
    });

    console.log(`[Roleta Sparty] Concedido ${spinsToGrant} giros para o usuário ${userId} (tickets: ${ticketIdsToMark.join(", ")})`);
  }
}

// ─── POST /api/tickets ─────────────────────────────────────────
// Inicia a compra de um ingresso e cria preferência no MercadoPago ou Simulação (ACID Compliant)
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

    // --- SEGURANÇA E PROVA DE PROPRIEDADE (OTP / MAGIC LINK PARA VISITANTES) ---
    const isVerified = isLoggedIn; // Autenticados são auto-verificados
    const verificationCode = isLoggedIn 
      ? null 
      : String(Math.floor(100000 + Math.random() * 900000)); // 6-digit OTP

    // ─── TRANSAÇÃO INTERATIVA ATÔMICA (ACID Compliant) ───
    // Encapsula verificação/atualização de cupom e criação do ticket para garantir que não haja
    // inconsistência caso qualquer operação falhe.
    const transactionResult = await prisma.$transaction(async (tx) => {
      let finalPrice = event.price;
      let discountAmount = 0;
      let couponId: string | null = null;

      let platformFee = parseFloat((finalPrice * 0.1).toFixed(2));
      let producerAmount = parseFloat((finalPrice - platformFee).toFixed(2));

      if (couponCode && couponCode.trim()) {
        const coupon = await tx.coupon.findUnique({
          where: { code: couponCode.trim().toUpperCase() },
        });

        if (!coupon) {
          throw new Error("Cupom inserido não existe");
        }

        if (!coupon.isActive || coupon.usedCount >= coupon.maxUses) {
          throw new Error("Este cupom de desconto já foi utilizado ou está expirado");
        }

        discountAmount = parseFloat(((event.price * coupon.discountPercent) / 100).toFixed(2));
        finalPrice = Math.max(0, parseFloat((event.price - discountAmount).toFixed(2)));
        couponId = coupon.id;

        // Calcular rateio financeiro do prejuízo do cupom
        const normalPlatformFee = parseFloat((event.price * 0.1).toFixed(2));
        const normalProducerAmount = parseFloat((event.price * 0.9).toFixed(2));

        const platformDiscountBurden = parseFloat(((discountAmount * coupon.platformSharePercent) / 100).toFixed(2));
        const producerDiscountBurden = parseFloat((discountAmount - platformDiscountBurden).toFixed(2));

        platformFee = Math.max(0, parseFloat((normalPlatformFee - platformDiscountBurden).toFixed(2)));
        producerAmount = Math.max(0, parseFloat((normalProducerAmount - producerDiscountBurden).toFixed(2)));

        // Atualizar contagem de uso do cupom de forma atômica
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      const mpAccessToken = process.env.MP_ACCESS_TOKEN;
      const isSimulated = !mpAccessToken || mpAccessToken.trim() === "" || mpAccessToken.includes("YOUR") || mpAccessToken.includes("sb_publishable");

      if (isSimulated) {
        if (process.env.NODE_ENV === "production") {
          throw new Error("Erro de Configuração Crítico: O token do MercadoPago está ausente em ambiente de PRODUÇÃO!");
        }

        const ticket = await tx.ticket.create({
          data: {
            eventId,
            userId,
            status: "APPROVED", // Auto-aprova em sandbox
            amount: finalPrice,
            platformFee,
            producerAmount,
            couponId,
            discountAmount,
            mpPaymentId: `SIMULADO-${Date.now()}`,
            mpPreferenceId: "SIMULADO-PREF",
            isVerified,
            verificationCode,
            spinGranted: false, // Inicia como falso, depois o helper avalia elegibilidade
          },
        });

        // Avaliar concessão de giros na simulação
        await grantSpinsIfEligible(tx, userId);

        return {
          ticket,
          simulated: true,
          amount: finalPrice,
          discountAmount,
          platformFee,
          producerAmount,
        };
      }

      // Caso integrado com MercadoPago real
      const ticket = await tx.ticket.create({
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
          spinGranted: false,
        },
      });

      return {
        ticket,
        simulated: false,
        amount: finalPrice,
        discountAmount,
        platformFee,
        producerAmount,
      };
    });


    // Se for uma compra simulada em dev, retorna diretamente
    if (transactionResult.simulated) {
      return NextResponse.json(
        {
          message: "Compra simulada com sucesso! (Modo Desenvolvimento)",
          simulated: true,
          ticketId: transactionResult.ticket.id,
          amount: transactionResult.amount,
          discountAmount: transactionResult.discountAmount,
          platformFee: transactionResult.platformFee,
          producerAmount: transactionResult.producerAmount,
          status: "APPROVED",
          isVerified,
          verificationCode,
        },
        { status: 201 }
      );
    }

    // --- CRIAÇÃO DE CHECKOUT MERCADOPAGO REAL ---
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const preference = await preferenceClient.create({
      body: {
        items: [
          {
            id: transactionResult.ticket.id,
            title: `Ingresso — ${event.title}`,
            description: `${event.venue} • ${new Date(event.date).toLocaleDateString("pt-BR")}`,
            quantity: 1,
            unit_price: transactionResult.amount,
            currency_id: "BRL",
          },
        ],
        payer: {
          name: userName || "Festeiro Convidado",
          email: userEmail || "convidado@letsparty.com",
        },
        marketplace_fee: transactionResult.platformFee,
        back_urls: {
          success: `${baseUrl}/tickets/success?ticketId=${transactionResult.ticket.id}`,
          failure: `${baseUrl}/tickets/failure?ticketId=${transactionResult.ticket.id}`,
          pending: `${baseUrl}/tickets/pending?ticketId=${transactionResult.ticket.id}`,
        },
        auto_return: "approved",
        notification_url: `${baseUrl}/api/webhooks/mercadopago`,
        external_reference: transactionResult.ticket.id,
        expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      },
    });

    // Salvar ID da preferência no ticket criado
    await prisma.ticket.update({
      where: { id: transactionResult.ticket.id },
      data: { mpPreferenceId: preference.id },
    });

    return NextResponse.json(
      {
        ticketId: transactionResult.ticket.id,
        preferenceId: preference.id,
        checkoutUrl: preference.init_point,
        sandboxCheckoutUrl: preference.sandbox_init_point,
        amount: transactionResult.amount,
        discountAmount: transactionResult.discountAmount,
        platformFee: transactionResult.platformFee,
        producerAmount: transactionResult.producerAmount,
        isVerified,
        verificationCode,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[POST /api/tickets] Erro transacional crítico:", error);
    return NextResponse.json(
      { error: error.message || "Erro de processamento interno no servidor" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
