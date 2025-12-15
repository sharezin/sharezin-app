import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET /api/receipts/invite/[inviteCode] - Buscar recibo por código de convite
export async function GET(
  request: NextRequest,
  { params }: { params: { inviteCode: string } }
) {
  try {
    const supabase = createServerClient();
    const inviteCode = params.inviteCode.toUpperCase();

    const { data: receipt, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('invite_code', inviteCode)
      .single();

    if (error || !receipt) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Código de convite inválido' },
        { status: 404 }
      );
    }

    // Buscar dados relacionados
    const [itemsResult, participantsResult, pendingParticipantsResult, deletionRequestsResult] = await Promise.all([
      supabase.from('receipt_items').select('*').eq('receipt_id', receipt.id),
      supabase.from('receipt_participants').select('participant_id').eq('receipt_id', receipt.id),
      supabase.from('pending_participants').select('*').eq('receipt_id', receipt.id),
      supabase.from('deletion_requests').select('*').eq('receipt_id', receipt.id),
    ]);

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
    console.error('Error in GET /api/receipts/invite/[inviteCode]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}

