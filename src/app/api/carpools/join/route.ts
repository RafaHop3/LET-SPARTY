import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// POST /api/carpools/join - Permite a um usuário juntar-se a uma carona (login opcional)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    let userId = (session?.user as any)?.id;

    const body = await req.json();
    const { carpoolId, guestName, guestPhone } = body;

    if (!carpoolId) {
      return NextResponse.json({ error: "carpoolId é obrigatório" }, { status: 400 });
    }

    // Protocolo de Login Opcional: Se não logado, cria um usuário guest temporário
    if (!userId) {
      if (!guestName || !guestPhone) {
        return NextResponse.json(
          { error: "É necessário estar logado ou preencher Nome e Telefone para solicitar vaga" },
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

    // Buscar carona e verificar se há assentos disponíveis
    const carpool = await prisma.carpool.findUnique({
      where: { id: carpoolId },
      include: {
        passengers: true,
      },
    });

    if (!carpool) {
      return NextResponse.json({ error: "Carona não encontrada" }, { status: 404 });
    }

    if (carpool.driverId === userId) {
      return NextResponse.json({ error: "Você é o motorista desta carona" }, { status: 400 });
    }

    // Verificar se já está na carona
    const alreadyPassenger = carpool.passengers.some(p => p.passengerId === userId);
    if (alreadyPassenger) {
      return NextResponse.json({ error: "Você já está participando desta carona" }, { status: 400 });
    }

    // Verificar assentos disponíveis
    const takenSeats = carpool.passengers.length;
    if (takenSeats >= carpool.availableSeats) {
      return NextResponse.json({ error: "Desculpe, esta carona já está lotada" }, { status: 400 });
    }

    // Criar o passageiro na carona
    const passengerRecord = await prisma.carpoolPassenger.create({
      data: {
        carpoolId,
        passengerId: userId,
      },
      include: {
        passenger: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Você se juntou à carona com sucesso!",
      passenger: passengerRecord,
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/carpools/join] Error:", error);
    return NextResponse.json({ error: "Erro ao juntar-se à carona" }, { status: 500 });
  }
}
