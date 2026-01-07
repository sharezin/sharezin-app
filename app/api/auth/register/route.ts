import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { emailExists, hashPassword, createUser } from '@/lib/services/authService';
import { generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verificar se email já existe
    if (await emailExists(supabase, email)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Email já cadastrado' },
        { status: 400 }
      );
    }

    // Hash da senha e criar usuário
    const passwordHash = await hashPassword(password);
    const user = await createUser(supabase, name, email, passwordHash);

    // Gerar token JWT
    const token = generateToken(user.id, user.email);

    return NextResponse.json(
      {
        token,
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar registro' },
      { status: 500 }
    );
  }
}

