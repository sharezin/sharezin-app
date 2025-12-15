import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, createAuthResponse } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';

// GET /api/receipts/[id] - Buscar recibo por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return createAuthResponse('Não autenticado');
  }

  try {
    const supabase = createServerClient();
    const receiptId = params.id;

    // Buscar recibo
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .single();

    if (receiptError || !receipt) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Recibo não encontrado' },
        { status: 404 }
      );
    }

    // Verificar permissão
    const isCreator = receipt.creator_id === user.id;
    
    // Buscar participantes do usuário
    const { data: userParticipants } = await supabase
      .from('participants')
      .select('id')
      .eq('user_id', user.id);

    const participantIds = userParticipants?.map(p => p.id) || [];
    
    let hasAccess = isCreator;
    
    if (!hasAccess && participantIds.length > 0) {
      const { data: participantCheck } = await supabase
        .from('receipt_participants')
        .select('participant_id')
        .eq('receipt_id', receiptId)
        .in('participant_id', participantIds);
      
      hasAccess = participantCheck && participantCheck.length > 0;
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão para acessar este recibo' },
        { status: 403 }
      );
    }

    // Buscar dados relacionados
    const [itemsResult, participantsResult, pendingParticipantsResult, deletionRequestsResult] = await Promise.all([
      supabase.from('receipt_items').select('*').eq('receipt_id', receiptId),
      supabase.from('receipt_participants').select('participant_id').eq('receipt_id', receiptId),
      supabase.from('pending_participants').select('*').eq('receipt_id', receiptId),
      supabase.from('deletion_requests').select('*').eq('receipt_id', receiptId),
    ]);

    // Buscar dados dos participantes
    const participantIds = participantsResult.data?.map(p => p.participant_id) || [];
    const { data: participants } = participantIds.length > 0
      ? await supabase.from('participants').select('*').in('id', participantIds)
      : { data: [] };

    return NextResponse.json({
      receipt: {
        ...receipt,
        items: itemsResult.data || [],
        participants: participants || [],
        pendingParticipants: pendingParticipantsResult.data || [],
        deletionRequests: deletionRequestsResult.data || [],
      },
    });
  } catch (error) {
    console.error('Error in GET /api/receipts/[id]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}

// PUT /api/receipts/[id] - Atualizar recibo
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return createAuthResponse('Não autenticado');
  }

  try {
    const body = await request.json();
    const supabase = createServerClient();
    const receiptId = params.id;

    // Verificar se é o criador
    const { data: receipt } = await supabase
      .from('receipts')
      .select('creator_id')
      .eq('id', receiptId)
      .single();

    if (!receipt || receipt.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Apenas o criador pode atualizar o recibo' },
        { status: 403 }
      );
    }

    // Atualizar recibo
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.serviceChargePercent !== undefined) updateData.service_charge_percent = body.serviceChargePercent;
    if (body.cover !== undefined) updateData.cover = body.cover;
    if (body.isClosed !== undefined) updateData.is_closed = body.isClosed;

    const { data: updatedReceipt, error } = await supabase
      .from('receipts')
      .update(updateData)
      .eq('id', receiptId)
      .select()
      .single();

    if (error) {
      console.error('Error updating receipt:', error);
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Erro ao atualizar recibo' },
        { status: 500 }
      );
    }

    return NextResponse.json({ receipt: updatedReceipt });
  } catch (error) {
    console.error('Error in PUT /api/receipts/[id]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}

// DELETE /api/receipts/[id] - Excluir recibo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return createAuthResponse('Não autenticado');
  }

  try {
    const supabase = createServerClient();
    const receiptId = params.id;

    // Verificar se é o criador
    const { data: receipt } = await supabase
      .from('receipts')
      .select('creator_id')
      .eq('id', receiptId)
      .single();

    if (!receipt || receipt.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Apenas o criador pode excluir o recibo' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('receipts')
      .delete()
      .eq('id', receiptId);

    if (error) {
      console.error('Error deleting receipt:', error);
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Erro ao excluir recibo' },
        { status: 500 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in DELETE /api/receipts/[id]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}

