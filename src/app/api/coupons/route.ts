import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// Gera um código alfanumérico aleatório
function generateRandomCode(length = 6): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "SPARTY";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// POST /api/coupons - Gera ou valida um cupom
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, discountPercent, code } = body;

    // --- AÇÃO: GERAR CUPOM ---
    if (action === "generate") {
      if (!discountPercent || discountPercent <= 0 || discountPercent > 100) {
        return NextResponse.json(
          { error: "Porcentagem de desconto inválida" },
          { status: 400 }
        );
      }

      const session = await getServerSession(authOptions);
      const userId = (session?.user as any)?.id || null;

      const couponCode = generateRandomCode();

      const coupon = await prisma.coupon.create({
        data: {
          code: couponCode,
          discountPercent: Number(discountPercent),
          maxUses: 1,
          usedCount: 0,
          isActive: true,
          userId: userId, // Pode ser nulo se for guest
        },
      });

      return NextResponse.json({
        message: "Cupom gerado com sucesso",
        code: coupon.code,
        discountPercent: coupon.discountPercent,
      }, { status: 201 });
    }

    // --- AÇÃO: VALIDAR CUPOM ---
    if (action === "validate") {
      if (!code) {
        return NextResponse.json({ error: "Código do cupom é obrigatório" }, { status: 400 });
      }

      const coupon = await prisma.coupon.findUnique({
        where: { code: code.toUpperCase() },
      });

      if (!coupon) {
        return NextResponse.json({ valid: false, error: "Cupom inválido ou inexistente" });
      }

      if (!coupon.isActive || coupon.usedCount >= coupon.maxUses) {
        return NextResponse.json({ valid: false, error: "Este cupom já foi utilizado ou está expirado" });
      }

      return NextResponse.json({
        valid: true,
        couponId: coupon.id,
        code: coupon.code,
        discountPercent: coupon.discountPercent,
      });
    }

    return NextResponse.json({ error: "Ação inválida. Use 'generate' ou 'validate'" }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/coupons] Error:", error);
    return NextResponse.json({ error: "Erro ao processar cupom" }, { status: 500 });
  }
}
