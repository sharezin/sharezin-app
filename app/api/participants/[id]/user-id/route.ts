import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, createAuthResponse } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';

// GET /api/participants/[id]/user-id - Buscar user_id de um participante
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return createAuthResponse('Não autenticado');
  }

  try {
    const resolvedParams = await params;
    const supabase = createServerClient();

    const { data: participant, error } = await supabase
      .from('participants')
      .select('user_id')
      .eq('id', resolvedParams.id)
      .single();

    if (error || !participant) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Participante não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ userId: participant.user_id });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}
