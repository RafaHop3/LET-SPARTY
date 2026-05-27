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

interface Slice {
  discount: number;
  weight: number;
  targetIndex: number;
}

const SPARTY_WHEEL_SLICES: Slice[] = [
  { discount: 5,  weight: 50, targetIndex: 0 },
  { discount: 10, weight: 30, targetIndex: 1 },
  { discount: 15, weight: 12, targetIndex: 2 },
  { discount: 20, weight: 6,  targetIndex: 3 },
  { discount: 25, weight: 2,  targetIndex: 4 }
];

function calculateWeightedDiscount(): { discount: number; targetIndex: number } {
  const totalWeight = SPARTY_WHEEL_SLICES.reduce((sum, slice) => sum + slice.weight, 0);
  let random = Math.random() * totalWeight;

  for (const slice of SPARTY_WHEEL_SLICES) {
    if (random < slice.weight) {
      return { discount: slice.discount, targetIndex: slice.targetIndex };
    }
    random -= slice.weight;
  }
  return { discount: 5, targetIndex: 0 }; // Fallback
}

// POST /api/coupons - Gera ou valida um cupom
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, code } = body;

    // --- AÇÃO: GERAR CUPOM ---
    if (action === "generate") {
      const session = await getServerSession(authOptions);
      const userId = (session?.user as any)?.id;

      if (!userId) {
        return NextResponse.json(
          { error: "É necessário estar autenticado para girar a roleta" },
          { status: 401 }
        );
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          // 1. Decrementa APENAS SE houver saldo
          // Se availableSpins for 0 ou o registro não for encontrado, o update lançará um erro RecordNotFound.
          await tx.user.update({
            where: { 
              id: userId,
              availableSpins: { gt: 0 }
            },
            data: { 
              availableSpins: { decrement: 1 } 
            },
            select: { 
              email: true 
            }
          });

          // 2. Calcula os pesos
          const { discount, targetIndex } = calculateWeightedDiscount();
          const couponCode = `SPARTY-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${discount}`;

          // 3. Cria o cupom com rateio de prejuízo 50/50
          const coupon = await tx.coupon.create({
            data: {
              code: couponCode,
              discountPercent: discount,
              platformSharePercent: 50.0,
              producerSharePercent: 50.0,
              userId: userId,
              maxUses: 1,
              usedCount: 0,
              isActive: true,
            }
          });

          return { coupon, targetIndex };
        });

        return NextResponse.json({
          message: "Cupom gerado com sucesso",
          code: result.coupon.code,
          discountPercent: result.coupon.discountPercent,
          targetIndex: result.targetIndex,
        }, { status: 201 });

      } catch (err: any) {
        console.error("[POST /api/coupons] Erro transacional:", err);
        // Tratar erro P2025 especificamente como "Saldo de giros insuficiente"
        if (err.code === "P2025" || err.message?.includes("Record to update not found")) {
          return NextResponse.json(
            { error: "Você não possui giros disponíveis na roleta! Adquira mais ingressos." },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: "Erro interno ao processar o seu giro na roleta." },
          { status: 500 }
        );
      }
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

// GET /api/coupons - Retorna o saldo de giros disponíveis para o usuário autenticado
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ availableSpins: 0 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { availableSpins: true }
    });

    return NextResponse.json({ availableSpins: user?.availableSpins || 0 });
  } catch (error) {
    console.error("[GET /api/coupons] Error:", error);
    return NextResponse.json({ availableSpins: 0 }, { status: 500 });
  }
}

