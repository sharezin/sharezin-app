import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, createAuthResponse } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import { createNotification } from '@/lib/services/notificationService';

// POST /api/receipts/[id]/request-join - Solicitar entrada no recibo
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const user = await getAuthUser(request);
  if (!user) {
    return createAuthResponse('Não autenticado');
  }

  try {
    const body = await request.json();
    const { name } = body;
    const supabase = createServerClient();
    const receiptId = resolvedParams.id;

    // Verificar se o recibo existe
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select('id, creator_id, is_closed, title')
      .eq('id', receiptId)
      .single();

    if (receiptError || !receipt) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Recibo não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o recibo está fechado
    if (receipt.is_closed) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Não é possível solicitar entrada em um recibo fechado' },
        { status: 400 }
      );
    }

    // Verificar se o usuário é o criador
    if (receipt.creator_id === user.id) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Você é o responsável por este recibo. Não é necessário solicitar entrada.' },
        { status: 400 }
      );
    }

    // Verificar se já é participante
    const { data: userParticipants } = await supabase
      .from('participants')
      .select('id')
      .eq('user_id', user.id);

    const participantIds = userParticipants?.map(p => p.id) || [];

    if (participantIds.length > 0) {
      const { data: receiptParticipants } = await supabase
        .from('receipt_participants')
        .select('participant_id')
        .eq('receipt_id', receiptId)
        .in('participant_id', participantIds);

      if (receiptParticipants && receiptParticipants.length > 0) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Você já é participante deste recibo' },
          { status: 400 }
        );
      }
    }

    // Verificar se já existe uma solicitação pendente
    const { data: existingPending } = await supabase
      .from('pending_participants')
      .select('id')
      .eq('receipt_id', receiptId)
      .eq('user_id', user.id)
      .single();

    if (existingPending) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Você já solicitou entrada neste recibo. Aguarde a aprovação do criador.' },
        { status: 400 }
      );
    }

    // Criar solicitação de participação pendente
    const { data: pendingParticipant, error: pendingError } = await supabase
      .from('pending_participants')
      .insert({
        receipt_id: receiptId,
        user_id: user.id,
        name: name || user.name,
        requested_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (pendingError || !pendingParticipant) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Erro ao criar solicitação de entrada' },
        { status: 500 }
      );
    }

    // Criar notificação para o criador do recibo
    try {
      await createNotification(supabase, {
        userId: receipt.creator_id,
        type: 'participant_request',
        title: 'Nova solicitação de participação',
        message: `${user.name} solicitou participar do recibo ${receipt.title}`,
        receiptId: receiptId,
        relatedUserId: user.id,
      });
    } catch (error) {
      // Não falhar a operação principal se a notificação falhar
    }

    return NextResponse.json(
      {
        message: 'Solicitação de entrada enviada com sucesso',
        pendingParticipant,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}
