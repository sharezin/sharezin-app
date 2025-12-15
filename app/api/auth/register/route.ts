import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

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
    const { data: existingUser } = await supabase
      .from('sharezin_users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Email já cadastrado' },
        { status: 400 }
      );
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 10);

    // Criar usuário
    const { data: user, error: userError } = await supabase
      .from('sharezin_users')
      .insert({
        name,
        email: email.toLowerCase(),
        password_hash: passwordHash,
      })
      .select('id, name, email, created_at')
      .single();

    if (userError || !user) {
      console.error('Error creating user:', userError);
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Erro ao criar usuário' },
        { status: 500 }
      );
    }

    // Gerar token JWT
    const { generateToken } = await import('@/lib/auth');
    const token = generateToken(user.id, user.email);

    return NextResponse.json(
      {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar registro' },
      { status: 500 }
    );
  }
}

