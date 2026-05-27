import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, role, cpf, cnpj, companyName } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Faltam campos obrigatórios' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // ─── TRANSAÇÃO ATÔMICA (ACID Compliant) ───
    // Criamos o Usuário Central e seu Perfil específico em um único bloco transacional.
    // Se a criação do perfil falhar (ex: CPF ou CNPJ duplicado), toda a operação sofre Rollback.
    const user = await prisma.$transaction(async (tx) => {
      const centralUser = await tx.user.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          passwordHash,
          role,
        }
      });

      if (role === 'FESTEIRO') {
        if (!cpf) {
          throw new Error('CPF é obrigatório para Festeiros');
        }

        // Validação preventiva contra duplicação de CPF
        const existingCpf = await tx.festeiroProfile.findUnique({
          where: { cpf: cpf.trim() }
        });
        if (existingCpf) {
          throw new Error('CPF já cadastrado no sistema');
        }

        await tx.festeiroProfile.create({
          data: {
            userId: centralUser.id,
            cpf: cpf.trim(),
          }
        });
      } else if (role === 'PRODUTORA') {
        if (!cnpj || !companyName) {
          throw new Error('CNPJ e Nome da Empresa são obrigatórios para Produtoras');
        }

        // Validação preventiva contra duplicação de CNPJ
        const existingCnpj = await tx.produtoraProfile.findUnique({
          where: { cnpj: cnpj.trim() }
        });
        if (existingCnpj) {
          throw new Error('CNPJ já cadastrado no sistema');
        }

        await tx.produtoraProfile.create({
          data: {
            userId: centralUser.id,
            cnpj: cnpj.trim(),
            companyName: companyName.trim(),
          }
        });
      }

      return centralUser;
    });

    return NextResponse.json({ message: 'Usuário cadastrado com sucesso', userId: user.id }, { status: 201 });
  } catch (error: any) {
    console.error('Registration Transaction Error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 });
  }
}
