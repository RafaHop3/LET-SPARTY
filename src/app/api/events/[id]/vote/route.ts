import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

// ─── POST /api/events/[id]/vote ────────────────────────────────
// Registra o voto de um FESTEIRO em um evento
// A janela de votação abre 2h após o início e dura 48h
export async function POST(req: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const user = session.user as any;
    const { id: eventId } = await params;

    // Verificar se o evento existe
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json(
        { error: "Evento não encontrado" },
        { status: 404 }
      );
    }

    // Verificar janela de votação (2h - 50h após o início)
    const now = new Date();
    const diffHours =
      (now.getTime() - event.date.getTime()) / (1000 * 60 * 60);
    if (diffHours < 2 || diffHours > 50) {
      return NextResponse.json(
        { error: "Votação não está aberta para este evento" },
        { status: 400 }
      );
    }

    // Verificar se o usuário tem ingresso aprovado para este evento
    const ticket = await prisma.ticket.findFirst({
      where: { eventId, userId: user.id, status: "APPROVED" },
    });
    if (!ticket) {
      return NextResponse.json(
        { error: "Você precisa ter um ingresso para votar" },
        { status: 403 }
      );
    }

    // Verificar se já votou
    const existingVote = await prisma.vote.findUnique({
      where: { userId_eventId: { userId: user.id, eventId } },
    });
    if (existingVote) {
      return NextResponse.json(
        { error: "Você já votou neste evento" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { score } = body;
    if (!score || score < 1 || score > 5) {
      return NextResponse.json(
        { error: "Score deve ser entre 1 e 5" },
        { status: 400 }
      );
    }

    // Criar o voto e atualizar a média do evento em transação
    const [vote] = await prisma.$transaction([
      prisma.vote.create({
        data: { userId: user.id, eventId, score },
      }),
      prisma.event.update({
        where: { id: eventId },
        data: {
          score: {
            set: parseFloat(
              (
                (event.score * event.votes + score) /
                (event.votes + 1)
              ).toFixed(2)
            ),
          },
          votes: { increment: 1 },
        },
      }),
    ]);

    return NextResponse.json(
      { message: "Voto registrado com sucesso", vote },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/events/[id]/vote]", error);
    return NextResponse.json(
      { error: "Erro ao registrar voto" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
