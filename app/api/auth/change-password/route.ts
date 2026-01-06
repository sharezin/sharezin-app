import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, createAuthResponse } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return createAuthResponse('Não autenticado');
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Senha atual e nova senha são obrigatórias' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Nova senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Buscar usuário com senha atual
    const { data: userData, error: userError } = await supabase
      .from('sharezin_users')
      .select('id, password_hash')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Verificar senha atual
    const isValidPassword = await bcrypt.compare(currentPassword, userData.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Senha atual incorreta' },
        { status: 401 }
      );
    }

    // Verificar se a nova senha é diferente da atual
    const isSamePassword = await bcrypt.compare(newPassword, userData.password_hash);
    if (isSamePassword) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'A nova senha deve ser diferente da senha atual' },
        { status: 400 }
      );
    }

    // Hash da nova senha
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Atualizar senha no banco
    const { error: updateError } = await supabase
      .from('sharezin_users')
      .update({
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Erro ao atualizar senha' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Senha alterada com sucesso',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}
