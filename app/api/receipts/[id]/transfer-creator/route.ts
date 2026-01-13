import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, createAuthResponse } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import { checkReceiptModificationPermission } from '@/lib/services/receiptPermissionService';
import { fetchReceiptData } from '@/lib/services/receiptDataService';
import { transformReceiptFromApi } from '@/lib/transformers/receiptTransformer';
import { createNotification } from '@/lib/services/notificationService';
import { getParticipantUserId } from '@/lib/services/receiptDataService';

// PUT /api/receipts/[id]/transfer-creator - Transferir criador do recibo
export async function PUT(
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
    const { newCreatorParticipantId } = body;
    const supabase = createServerClient();
    const receiptId = resolvedParams.id;

    if (!newCreatorParticipantId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'ID do novo criador é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o usuário é o criador atual
    const permission = await checkReceiptModificationPermission(supabase, receiptId, user.id);
    
    if (!permission.isCreator) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Apenas o criador atual pode transferir a responsabilidade' },
        { status: 403 }
      );
    }

    // Verificar se o recibo está fechado
    if (permission.isClosed) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Não é possível transferir criador de um recibo fechado' },
        { status: 400 }
      );
    }

    // Verificar se o recibo existe e buscar dados
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select('id, creator_id, title, is_closed')
      .eq('id', receiptId)
      .single();

    if (receiptError || !receipt) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Recibo não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o novo criador não é o criador atual
    const newCreatorUserId = await getParticipantUserId(supabase, newCreatorParticipantId);
    
    if (!newCreatorUserId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Novo criador não encontrado' },
        { status: 400 }
      );
    }

    // Verificar se não está tentando transferir para si mesmo
    if (newCreatorUserId === user.id) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Não é possível transferir para si mesmo' },
        { status: 400 }
      );
    }

    // Verificar se o novo criador é participante do recibo
    const { data: receiptParticipants } = await supabase
      .from('receipt_participants')
      .select('participant_id')
      .eq('receipt_id', receiptId)
      .eq('participant_id', newCreatorParticipantId)
      .single();

    if (!receiptParticipants) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'O novo criador deve ser um participante do recibo' },
        { status: 400 }
      );
    }

    // Verificar se o novo criador não fechou sua participação
    const { data: participant } = await supabase
      .from('participants')
      .select('id, is_closed, name')
      .eq('id', newCreatorParticipantId)
      .single();

    if (!participant) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Participante não encontrado' },
        { status: 400 }
      );
    }

    if (participant.is_closed) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Não é possível transferir para um participante que fechou sua participação' },
        { status: 400 }
      );
    }

    // Atualizar creator_id na tabela receipts
    const { error: updateError } = await supabase
      .from('receipts')
      .update({
        creator_id: newCreatorUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', receiptId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Erro ao transferir criador' },
        { status: 500 }
      );
    }

    // Criar notificações
    try {
      // Notificação para o novo criador
      await createNotification(supabase, {
        userId: newCreatorUserId,
        type: 'creator_transferred',
        title: 'Você agora é o responsável',
        message: `Você agora é o responsável pelo recibo ${receipt.title}`,
        receiptId: receiptId,
        relatedUserId: user.id,
      });

      // Notificação para o criador antigo
      await createNotification(supabase, {
        userId: user.id,
        type: 'creator_transferred_from',
        title: 'Responsabilidade transferida',
        message: `Você transferiu a responsabilidade do recibo ${receipt.title} para ${participant.name}`,
        receiptId: receiptId,
        relatedUserId: newCreatorUserId,
      });
    } catch (error) {
      // Não falhar a operação principal se as notificações falharem
    }

    // Buscar recibo atualizado
    const { data: updatedReceiptData, error: fetchError } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .single();

    if (fetchError || !updatedReceiptData) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Erro ao buscar recibo atualizado' },
        { status: 500 }
      );
    }

    // Buscar dados relacionados
    const receiptData = await fetchReceiptData(supabase, receiptId);

    // Combinar recibo com dados relacionados
    const fullReceipt = {
      ...updatedReceiptData,
      items: receiptData.items,
      participants: receiptData.participants,
      pending_participants: receiptData.pendingParticipants,
      deletion_requests: receiptData.deletionRequests,
    };

    const updatedReceipt = transformReceiptFromApi(fullReceipt);

    return NextResponse.json({ receipt: updatedReceipt });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}
