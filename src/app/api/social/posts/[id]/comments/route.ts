import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

// POST /api/social/posts/[id]/comments - Adiciona comentário a um post (login opcional)
export async function POST(req: Request, { params }: Params) {
  try {
    const { id: postId } = await params;
    const session = await getServerSession(authOptions);
    let userId = (session?.user as any)?.id;

    // Protocolo de Login Opcional: Se não logado, mapeia para um usuário convidado
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
    const { content, customName } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Conteúdo do comentário é obrigatório" }, { status: 400 });
    }

    // Se guest inseriu um nome customizado
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

    // Verificar se o post existe
    const postExists = await prisma.post.findUnique({ where: { id: postId } });
    if (!postExists) {
      return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        postId,
        userId: finalUserId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("[POST /api/social/posts/[id]/comments] Error:", error);
    return NextResponse.json({ error: "Erro ao criar comentário" }, { status: 500 });
  }
}
