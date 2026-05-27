import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

// ─── GET /api/events/[id] ──────────────────────────────────────
export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        produtora: {
          select: {
            id: true,
            name: true,
            produtoraProfile: {
              select: { companyName: true, description: true },
            },
          },
        },
        _count: {
          select: { tickets: { where: { status: "APPROVED" } } },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Evento não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error("[GET /api/events/[id]]", error);
    return NextResponse.json(
      { error: "Erro ao buscar evento" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
