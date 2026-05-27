import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    if (user.role !== "PRODUTORA") {
      return NextResponse.json(
        { error: "Apenas produtoras podem ver seus próprios eventos" },
        { status: 403 }
      );
    }

    const events = await prisma.event.findMany({
      where: { produtoraId: user.id },
      orderBy: { date: "desc" },
      include: {
        tickets: {
          where: { status: "APPROVED" },
          select: {
            amount: true,
            platformFee: true,
            producerAmount: true,
          },
        },
        _count: {
          select: {
            tickets: { where: { status: "APPROVED" } },
          },
        },
      },
    });

    // Calculate aggregated stats for the producer dashboard
    const stats = events.reduce(
      (acc, event) => {
        const eventTicketsCount = event.tickets.length;
        const eventRevenue = event.tickets.reduce((sum, t) => sum + t.amount, 0);
        const eventPlatformFee = event.tickets.reduce((sum, t) => sum + t.platformFee, 0);
        const eventNetRevenue = event.tickets.reduce((sum, t) => sum + t.producerAmount, 0);

        acc.totalTicketsSold += eventTicketsCount;
        acc.totalGrossRevenue += eventRevenue;
        acc.totalPlatformFees += eventPlatformFee;
        acc.totalNetRevenue += eventNetRevenue;

        acc.eventStats.push({
          id: event.id,
          title: event.title,
          ticketsCount: eventTicketsCount,
          grossRevenue: eventRevenue,
          netRevenue: eventNetRevenue,
          platformFee: eventPlatformFee,
          date: event.date,
        });

        return acc;
      },
      {
        totalTicketsSold: 0,
        totalGrossRevenue: 0,
        totalPlatformFees: 0,
        totalNetRevenue: 0,
        eventStats: [] as any[],
      }
    );

    return NextResponse.json({ events, stats });
  } catch (error) {
    console.error("[GET /api/events/mine] Error:", error);
    // Don't log sensitive database detail, just generic warning to comply with no logs protocol
    return NextResponse.json(
      { error: "Erro ao buscar relatórios de eventos" },
      { status: 500 }
    );
  }
}
