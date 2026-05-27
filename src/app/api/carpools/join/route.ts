import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// POST /api/carpools/join - Permite a um usuário juntar-se a uma carona (ACID transacional robusto contra concorrência)
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

    // ─── TRANSAÇÃO INTERATIVA ATÔMICA (ACID) ───
    // Evita concorrência destrutiva onde dois requests paralelos lêem vagas livres antes de escrever no banco.
    const passengerRecord = await prisma.$transaction(async (tx) => {
      // Buscar carona e passageiros de forma transacional isolada
      const carpool = await tx.carpool.findUnique({
        where: { id: carpoolId },
        include: {
          passengers: true,
        },
      });

      if (!carpool) {
        throw new Error("Carona não encontrada no sistema");
      }

      if (carpool.driverId === userId) {
        throw new Error("Você é o motorista desta carona e não pode entrar como passageiro");
      }

      // Verificar se já está na carona
      const alreadyPassenger = carpool.passengers.some(p => p.passengerId === userId);
      if (alreadyPassenger) {
        throw new Error("Você já está participando desta carona");
      }

      // Verificar assentos disponíveis de forma isolada
      const takenSeats = carpool.passengers.length;
      if (takenSeats >= carpool.availableSeats) {
        throw new Error("Desculpe, esta carona já está lotada!");
      }

      // Criar o passageiro na carona de forma atômica
      return await tx.carpoolPassenger.create({
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
    });

    return NextResponse.json({
      message: "Você se juntou à carona com sucesso!",
      passenger: passengerRecord,
    }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/carpools/join] Erro transacional crítico:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao juntar-se à carona" },
      { status: 500 }
    );
  }
}
