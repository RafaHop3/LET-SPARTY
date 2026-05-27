import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// ─── GET /api/events ─────────────────────────────────────────
// Retorna lista de eventos, opcionalmente filtrados por categoria
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const city = searchParams.get("city");

    const where: any = { isActive: true };
    if (category) where.category = category;
    if (city) where.city = { contains: city, mode: "insensitive" };

    const events = await prisma.event.findMany({
      where,
      orderBy: { score: "desc" },
      include: {
        produtora: {
          select: {
            id: true,
            name: true,
            produtoraProfile: { select: { companyName: true } },
          },
        },
        _count: { select: { tickets: { where: { status: "APPROVED" } } } },
      },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("[GET /api/events]", error);
    return NextResponse.json(
      { error: "Erro ao buscar eventos" },
      { status: 500 }
    );
  }
}

// ─── POST /api/events ─────────────────────────────────────────
// Cria um novo evento — apenas PRODUTORA autenticada
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== "PRODUTORA") {
      return NextResponse.json(
        { error: "Apenas produtoras podem criar eventos" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, category, date, price, venue, city, imageUrl, description } =
      body;

    if (!title || !category || !date || price === undefined || !venue) {
      return NextResponse.json(
        { error: "Campos obrigatórios: title, category, date, price, venue" },
        { status: 400 }
      );
    }

    const event = await prisma.event.create({
      data: {
        title,
        category,
        date: new Date(date),
        price: Number(price),
        venue,
        city: city || "",
        imageUrl,
        description,
        produtoraId: user.id,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("[POST /api/events]", error);
    return NextResponse.json(
      { error: "Erro ao criar evento" },
      { status: 500 }
    );
  }
}

// ─── OPTIONS — preflight CORS ────────────────────────────────
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
