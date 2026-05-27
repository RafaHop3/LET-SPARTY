import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET /api/social/posts - Retorna posts da rede social
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    const where = eventId ? { eventId } : {};

    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            festeiroProfile: { select: { avatarUrl: true } },
          },
        },
        event: {
          select: {
            id: true,
            title: true,
          },
        },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error("[GET /api/social/posts] Error:", error);
    return NextResponse.json({ error: "Erro ao buscar feed social" }, { status: 500 });
  }
}

// POST /api/social/posts - Cria um novo post (login opcional)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    let userId = (session?.user as any)?.id;
    let userName = session?.user?.name || "Festeiro Convidado";

    // Protocolo de Login Opcional: Se não logado, mapeia para um usuário convidado persistente
    if (!userId) {
      const guestUser = await prisma.user.upsert({
        where: { email: "guest@letsparty.com" },
        update: {},
        create: {
          email: "guest@letsparty.com",
          name: "Festeiro Convidado",
          role: "FESTEIRO",
        },
      });
      userId = guestUser.id;
    }

    const body = await req.json();
    const { content, imageUrl, eventId, customName } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Conteúdo do post é obrigatório" }, { status: 400 });
    }

    // Se o guest inseriu um nome customizado no feed, atualiza no post
    let finalUserId = userId;
    if (!session?.user && customName && customName.trim()) {
      const customGuest = await prisma.user.create({
        data: {
          email: `guest-${Date.now()}-${Math.floor(Math.random() * 1000)}@letsparty.com`,
          name: customName.trim(),
          role: "FESTEIRO",
        },
      });
      finalUserId = customGuest.id;
    }

    const post = await prisma.post.create({
      data: {
        content,
        imageUrl: imageUrl || null,
        userId: finalUserId,
        eventId: eventId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("[POST /api/social/posts] Error:", error);
    return NextResponse.json({ error: "Erro ao criar post" }, { status: 500 });
  }
}
