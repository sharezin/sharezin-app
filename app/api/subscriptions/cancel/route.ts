import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAuthUser, createAuthResponse } from '@/lib/auth';

// POST /api/subscriptions/cancel - Cancelar assinatura ativa
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return createAuthResponse('Não autenticado');
    }

    const supabase = createServerClient();

    // Buscar assinatura ativa do usuário
    const { data: subscription, error: findError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (findError || !subscription) {
      return NextResponse.json(
        { error: 'Nenhuma assinatura ativa encontrada' },
        { status: 404 }
      );
    }

    // Cancelar assinatura (não deletar, apenas marcar como cancelled)
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      message: 'Assinatura cancelada com sucesso',
      subscription: {
        id: subscription.id,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao cancelar assinatura' },
      { status: 500 }
    );
  }
}
