import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, createAuthResponse } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import { checkReceiptModificationPermission } from '@/lib/services/receiptPermissionService';
import { fetchReceiptData } from '@/lib/services/receiptDataService';
import { transformReceiptFromApi } from '@/lib/transformers/receiptTransformer';

// POST /api/receipts/[id]/participants/[participantId]/close - Fechar participação de um participante
export async function POST(
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
        { error: 'Forbidden', message: 'Apenas o criador pode fechar participações' },
        { status: 403 }
      );
    }

    // Verificar se o recibo está fechado
    if (permission.isClosed) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Não é possível fechar participações em um recibo fechado' },
        { status: 400 }
      );
    }

    // Verificar se o recibo existe
    const { data: receipt } = await supabase
      .from('receipts')
      .select('id, creator_id, is_closed')
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

    // Não permitir fechar a própria participação como criador
    if (participantId === user.id) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Use a opção "Fechar Minha Participação" para fechar sua própria participação' },
        { status: 403 }
      );
    }

    // Atualizar participante para fechado
    const { error: updateError } = await supabase
      .from('participants')
      .update({ is_closed: true, updated_at: new Date().toISOString() })
      .eq('id', participantId);

    if (updateError) {
      console.error('Erro ao fechar participação:', updateError);
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Erro ao fechar participação' },
        { status: 500 }
      );
    }

    // Buscar recibo atualizado
    const receiptData = await fetchReceiptData(supabase, receiptId);
    const updatedReceipt = transformReceiptFromApi(receiptData);

    return NextResponse.json({ receipt: updatedReceipt });
  } catch (error) {
    console.error('Erro ao fechar participação:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao fechar participação' },
      { status: 500 }
    );
  }
}
