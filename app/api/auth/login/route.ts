import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Buscar usuário pelo email
    const { data: user, error: userError } = await supabase
      .from('sharezin_users')
      .select('id, name, email, password_hash')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Gerar token JWT
    const { generateToken } = await import('@/lib/auth');
    const token = generateToken(user.id, user.email);

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar login' },
      { status: 500 }
    );
  }
}

