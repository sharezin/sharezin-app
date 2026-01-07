import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, createAuthResponse } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import { checkReceiptModificationPermission } from '@/lib/services/receiptPermissionService';
import { fetchReceiptData } from '@/lib/services/receiptDataService';
import { removeParticipantFromReceipt } from '@/lib/services/receiptService';
import { transformReceiptFromApi } from '@/lib/transformers/receiptTransformer';

// DELETE /api/receipts/[id]/participants/[participantId] - Remover participante do recibo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  const resolvedParams = await params;
  const user = await getAuthUser(request);
  if (!user) {
    return createAuthResponse('Não autenticado');
  }

  try {
    const supabase = createServerClient();
    const receiptId = resolvedParams.id;
    const participantId = resolvedParams.participantId;

    // Verificar se o usuário é o criador
    const permission = await checkReceiptModificationPermission(supabase, receiptId, user.id);
    
    if (!permission.canModify) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Apenas o criador pode remover participantes' },
        { status: 403 }
      );
    }

    // Verificar se o recibo existe
    const { data: receipt } = await supabase
      .from('receipts')
      .select('id, creator_id')
      .eq('id', receiptId)
      .single();

    if (!receipt) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Recibo não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o participante existe e está no recibo
    const { data: receiptParticipant } = await supabase
      .from('receipt_participants')
      .select('participant_id')
      .eq('receipt_id', receiptId)
      .eq('participant_id', participantId)
      .single();

    if (!receiptParticipant) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Participante não encontrado neste recibo' },
        { status: 404 }
      );
    }

    // Não permitir remover o próprio criador
    if (participantId === user.id) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Não é possível remover a própria participação como criador' },
        { status: 403 }
      );
    }

    // Remover participante e seus produtos
    await removeParticipantFromReceipt(supabase, receiptId, participantId);

    // Buscar recibo atualizado
    const receiptData = await fetchReceiptData(supabase, receiptId);
    const updatedReceipt = transformReceiptFromApi(receiptData);

    return NextResponse.json({ receipt: updatedReceipt });
  } catch (error) {
    console.error('Erro ao remover participante:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao remover participante' },
      { status: 500 }
    );
  }
}
