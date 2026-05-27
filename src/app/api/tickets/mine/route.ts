import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// ─── GET /api/tickets/mine ─────────────────────────────────────
// Retorna todos os ingressos do usuário autenticado
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string; name?: string; email?: string };

    const tickets = await prisma.ticket.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            category: true,
            date: true,
            venue: true,
            city: true,
            imageUrl: true,
            score: true,
            votes: true,
          },
        },
      },
    });

    return NextResponse.json(tickets);
  } catch (error) {
    console.error("[GET /api/tickets/mine]", error);
    return NextResponse.json(
      { error: "Erro ao buscar ingressos" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
