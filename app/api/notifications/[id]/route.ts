import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, createAuthResponse } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';

// PUT /api/notifications/[id] - Marcar notificação específica como lida
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return createAuthResponse('Não autenticado');
  }

  try {
    const { id } = await params;
    const supabase = createServerClient();

    // Verificar se a notificação pertence ao usuário
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !notification) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Notificação não encontrada' },
        { status: 404 }
      );
    }

    // Marcar como lida
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Erro ao atualizar notificação' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/[id] - Deletar notificação
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return createAuthResponse('Não autenticado');
  }

  try {
    const { id } = await params;
    const supabase = createServerClient();

    // Verificar se a notificação pertence ao usuário
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !notification) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Notificação não encontrada' },
        { status: 404 }
      );
    }

    // Deletar notificação
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Erro ao deletar notificação' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}
