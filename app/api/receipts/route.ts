import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, createAuthResponse } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import { generateInviteCode } from '@/lib/utils';

// GET /api/receipts - Listar recibos
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return createAuthResponse('Não autenticado');
  }

  try {
    const { searchParams } = new URL(request.url);
    const includeClosed = searchParams.get('includeClosed') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = createServerClient();

    // Buscar participantes do usuário
    const { data: userParticipants } = await supabase
      .from('participants')
      .select('id')
      .eq('user_id', user.id);

    const participantIds = userParticipants?.map(p => p.id) || [];

    // Buscar recibos onde o usuário é criador ou participante
    let query = supabase
      .from('receipts')
      .select('*')
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filtrar por criador ou participante
    if (participantIds.length > 0) {
      // Buscar receipt_ids onde o usuário é participante
      const { data: receiptParticipants } = await supabase
        .from('receipt_participants')
        .select('receipt_id')
        .in('participant_id', participantIds);

      const receiptIds = receiptParticipants?.map(rp => rp.receipt_id) || [];
      
      if (receiptIds.length > 0) {
        query = query.or(`creator_id.eq.${user.id},id.in.(${receiptIds.join(',')})`);
      } else {
        query = query.eq('creator_id', user.id);
      }
    } else {
      query = query.eq('creator_id', user.id);
    }

    if (!includeClosed) {
      query = query.eq('is_closed', false);
    }

    const { data: receipts, error } = await query;

    if (error) {
      console.error('Error fetching receipts:', error);
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Erro ao buscar recibos' },
        { status: 500 }
      );
    }

    // Buscar itens e outros dados relacionados
    const receiptsWithData = await Promise.all(
      (receipts || []).map(async (receipt) => {
        const { data: items } = await supabase
          .from('receipt_items')
          .select('*')
          .eq('receipt_id', receipt.id);

        const { data: pendingParticipants } = await supabase
          .from('pending_participants')
          .select('*')
          .eq('receipt_id', receipt.id);

        const { data: deletionRequests } = await supabase
          .from('deletion_requests')
          .select('*')
          .eq('receipt_id', receipt.id);

        return {
          ...receipt,
          items: items || [],
          pendingParticipants: pendingParticipants || [],
          deletionRequests: deletionRequests || [],
        };
      })
    );

    return NextResponse.json({
      receipts: receiptsWithData,
      total: receiptsWithData.length,
    });
  } catch (error) {
    console.error('Error in GET /api/receipts:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}

// POST /api/receipts - Criar recibo
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return createAuthResponse('Não autenticado');
  }

  try {
    const body = await request.json();
    const { title, serviceChargePercent = 0, cover = 0, groupId } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Título é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const inviteCode = generateInviteCode();

    // Criar recibo
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .insert({
        title,
        creator_id: user.id,
        invite_code: inviteCode,
        service_charge_percent: serviceChargePercent,
        cover,
        date: new Date().toISOString(),
      })
      .select()
      .single();

    if (receiptError || !receipt) {
      console.error('Error creating receipt:', receiptError);
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Erro ao criar recibo' },
        { status: 500 }
      );
    }

    // Se groupId foi fornecido, adicionar participantes do grupo
    if (groupId) {
      const { data: groupParticipants } = await supabase
        .from('participants')
        .select('*')
        .eq('group_id', groupId);

      if (groupParticipants && groupParticipants.length > 0) {
        const receiptParticipants = groupParticipants.map(p => ({
          receipt_id: receipt.id,
          participant_id: p.id,
        }));

        await supabase.from('receipt_participants').insert(receiptParticipants);
      }
    }

    return NextResponse.json(
      {
        receipt: {
          ...receipt,
          participants: [],
          pendingParticipants: [],
          items: [],
          deletionRequests: [],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/receipts:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}

