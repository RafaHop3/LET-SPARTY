import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET /api/carpools - Lista caronas por evento
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json({ error: "eventId é obrigatório" }, { status: 400 });
    }

    const carpools = await prisma.carpool.findMany({
      where: { eventId },
      orderBy: { departureTime: "asc" },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            festeiroProfile: { select: { phone: true, avatarUrl: true } },
          },
        },
        passengers: {
          include: {
            passenger: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(carpools);
  } catch (error) {
    console.error("[GET /api/carpools] Error:", error);
    return NextResponse.json({ error: "Erro ao buscar caronas" }, { status: 500 });
  }
}

// POST /api/carpools - Oferece uma carona (login opcional)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    let userId = (session?.user as any)?.id;

    const body = await req.json();
    const { eventId, availableSeats, departureLocation, departureTime, description, signedWaiver, guestName, guestPhone } = body;

    // Protocolo de Login Opcional: Se não logado e fornecido dados do guest, cria um usuário guest temporário
    if (!userId) {
      if (!guestName || !guestPhone) {
        return NextResponse.json(
          { error: "É necessário estar logado ou preencher Nome e Telefone para oferecer carona" },
          { status: 400 }
        );
      }
      
      const customGuest = await prisma.user.create({
        data: {
          email: `guest-${Date.now()}-${Math.floor(Math.random() * 1000)}@letsparty.com`,
          name: guestName.trim(),
          role: "FESTEIRO",
          festeiroProfile: {
            create: {
              phone: guestPhone.trim(),
              cpf: `GUEST-${Date.now()}`,
            },
          },
        },
      });
      userId = customGuest.id;
    }

    if (!eventId || !availableSeats || !departureLocation || !departureTime) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltantes: eventId, availableSeats, departureLocation, departureTime" },
        { status: 400 }
      );
    }

    if (!signedWaiver) {
      return NextResponse.json(
        { error: "É necessário aceitar o Termo de Responsabilidade (motorista sóbrio)" },
        { status: 400 }
      );
    }

    const carpool = await prisma.carpool.create({
      data: {
        eventId,
        driverId: userId,
        availableSeats: Number(availableSeats),
        departureLocation,
        departureTime: new Date(departureTime),
        description: description || null,
        signedWaiver: true, // Forçado true
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(carpool, { status: 201 });
  } catch (error) {
    console.error("[POST /api/carpools] Error:", error);
    return NextResponse.json({ error: "Erro ao criar oferta de carona" }, { status: 500 });
  }
}
