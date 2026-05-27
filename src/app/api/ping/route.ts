import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Rota GET /api/ping
// Utilizado para manter a Vercel quente (evitando cold-starts) e o Supabase ativo 24/7
export async function GET(req: Request) {
  try {
    // Executa uma query levíssima para registrar atividade no banco de dados e aquecer o connection pooler
    const eventCount = await prisma.event.count();

    return NextResponse.json({
      status: "alive",
      dbConnected: true,
      events: eventCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET /api/ping] Erro no Keep-Alive do banco de dados:", error);
    return NextResponse.json(
      {
        status: "error",
        dbConnected: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
