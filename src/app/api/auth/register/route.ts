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
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create the central User
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
      }
    });

    // Create specific profiles
    if (role === 'FESTEIRO') {
      if (!cpf) {
        return NextResponse.json({ error: 'CPF é obrigatório para Festeiros' }, { status: 400 });
      }
      await prisma.festeiroProfile.create({
        data: {
          userId: user.id,
          cpf,
        }
      });
    } else if (role === 'PRODUTORA') {
      if (!cnpj || !companyName) {
        return NextResponse.json({ error: 'CNPJ e Nome da Empresa são obrigatórios para Produtoras' }, { status: 400 });
      }
      await prisma.produtoraProfile.create({
        data: {
          userId: user.id,
          cnpj,
          companyName,
        }
      });
    }

    return NextResponse.json({ message: 'Usuário cadastrado com sucesso', userId: user.id }, { status: 201 });
  } catch (error: any) {
    console.error('Registration Error:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
