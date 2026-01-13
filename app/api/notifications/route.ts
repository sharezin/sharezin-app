import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, createAuthResponse } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';

// GET /api/notifications - Listar notificações do usuário
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return createAuthResponse('Não autenticado');
  }

  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 25; // Fixo em 25 notificações por página
    const offset = (page - 1) * limit;

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error, count } = await query;

    if (error) {
      // Se o erro for sobre tabela não encontrada no cache, retornar erro específico
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return NextResponse.json(
          { 
            error: 'Service Unavailable', 
            message: 'Tabela de notificações ainda não está disponível. Aguarde alguns segundos e tente novamente.' 
          },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Erro ao buscar notificações', details: error.message },
        { status: 500 }
      );
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return NextResponse.json({
      notifications: notifications || [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Criar nova notificação
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return createAuthResponse('Não autenticado');
  }

  try {
    const body = await request.json();
    const { userId, type, title, message, receiptId, relatedUserId } = body;

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Campos obrigatórios: userId, type, title, message' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: type,
        title: title,
        message: message,
        receipt_id: receiptId || null,
        related_user_id: relatedUserId || null,
        is_read: false,
      });

    if (error) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Erro ao criar notificação' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}

// PUT /api/notifications - Marcar notificações como lidas
export async function PUT(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return createAuthResponse('Não autenticado');
  }

  try {
    const body = await request.json();
    const supabase = createServerClient();

    if (body.markAllAsRead) {
      // Marcar todas como lidas
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        return NextResponse.json(
          { error: 'Internal Server Error', message: 'Erro ao marcar notificações como lidas' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    } else if (body.notificationIds && Array.isArray(body.notificationIds)) {
      // Marcar notificações específicas como lidas
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('id', body.notificationIds);

      if (error) {
        return NextResponse.json(
          { error: 'Internal Server Error', message: 'Erro ao marcar notificações como lidas' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Parâmetros inválidos' },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}
