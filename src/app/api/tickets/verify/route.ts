import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/tickets/verify - Valida o código OTP (prova de propriedade de e-mail) do visitante
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ticketId, code } = body;

    if (!ticketId || !code) {
      return NextResponse.json(
        { error: "Campos obrigatórios: ticketId e code" },
        { status: 400 }
      );
    }

    // Buscar o ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        event: {
          select: { title: true }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ingresso não encontrado" }, { status: 404 });
    }

    if (ticket.isVerified) {
      return NextResponse.json({ message: "Ingresso já está verificado e ativo!", verified: true });
    }

    // Verificar correspondência do código de segurança
    if (ticket.verificationCode !== code.trim()) {
      return NextResponse.json(
        { error: "Código de verificação incorreto ou expirado" },
        { status: 400 }
      );
    }

    // Atualizar ticket para verificado
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        isVerified: true,
        verificationCode: null, // Limpa para segurança pós uso
      },
    });

    return NextResponse.json({
      message: `Ingresso para "${ticket.event.title}" verificado com sucesso! Seu ingresso agora está ativo e pronto para uso.`,
      verified: true
    });
  } catch (error) {
    console.error("[POST /api/tickets/verify] Erro de validação:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao validar ingresso" },
      { status: 500 }
    );
  }
}
