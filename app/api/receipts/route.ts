import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, createAuthResponse } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import { generateInviteCode } from '@/lib/utils';
import { fetchReceiptData } from '@/lib/services/receiptDataService';

// GET /api/receipts - Listar recibos
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return createAuthResponse('Não autenticado');
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const includeClosed = searchParams.get('includeClosed') === 'true';
    const onlyClosed = searchParams.get('onlyClosed') === 'true'; // Novo parâmetro para retornar apenas fechados
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

    // Filtrar por status de fechamento
    if (onlyClosed) {
      // Se onlyClosed=true, retornar apenas recibos fechados (para histórico)
      query = query.eq('is_closed', true);
    } else if (!includeClosed) {
      // Se includeClosed=false, retornar apenas recibos abertos (para home)
      query = query.eq('is_closed', false);
    }
    // Se includeClosed=true e onlyClosed=false, retornar todos (abertos e fechados)

    const { data: receipts, error } = await query;

    if (error) {
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

        const { data: receiptParticipants } = await supabase
          .from('receipt_participants')
          .select('participant_id')
          .eq('receipt_id', receipt.id);

        // Buscar dados dos participantes do recibo
        const receiptParticipantIds = receiptParticipants?.map(p => p.participant_id) || [];
        const { data: participants } = receiptParticipantIds.length > 0
          ? await supabase.from('participants').select('*').in('id', receiptParticipantIds)
          : { data: [] };

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
              participants: participants || [],
              pending_participants: pendingParticipants || [],
              deletion_requests: deletionRequests || [],
            };
      })
    );

    return NextResponse.json({
      receipts: receiptsWithData,
      total: receiptsWithData.length,
    });
  } catch (error) {
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
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Erro ao criar recibo' },
        { status: 500 }
      );
    }

    // Adicionar o criador como participante automaticamente
    // Verificar se já existe um participante com o user_id do criador
    const { data: existingCreatorParticipant } = await supabase
      .from('participants')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let creatorParticipantId: string;

    if (existingCreatorParticipant) {
      // Usar participante existente
      creatorParticipantId = existingCreatorParticipant.id;
    } else {
      // Criar novo participante para o criador
      const { data: userData } = await supabase
        .from('sharezin_users')
        .select('name')
        .eq('id', user.id)
        .single();

      const { data: newParticipant, error: participantError } = await supabase
        .from('participants')
        .insert({
          name: userData?.name || user.name,
          user_id: user.id,
          is_closed: false,
        })
        .select()
        .single();

      if (participantError || !newParticipant) {
        console.error('Erro ao criar participante para o criador:', participantError);
        // Se falhar, não adicionar como participante agora (será criado quando adicionar primeiro item)
        creatorParticipantId = '';
      } else {
        creatorParticipantId = newParticipant.id;
      }
    }

    // Adicionar criador como participante do recibo (se conseguiu criar/encontrar o participante)
    if (creatorParticipantId) {
      await supabase
        .from('receipt_participants')
        .insert({
          receipt_id: receipt.id,
          participant_id: creatorParticipantId,
        });
    }

    // Se groupId foi fornecido, adicionar participantes do grupo
    if (groupId) {
      const { data: groupParticipants } = await supabase
        .from('participants')
        .select('*')
        .eq('group_id', groupId);

      if (groupParticipants && groupParticipants.length > 0) {
        const receiptParticipants = groupParticipants
          .filter(p => p.id !== creatorParticipantId) // Evitar duplicar o criador
          .map(p => ({
            receipt_id: receipt.id,
            participant_id: p.id,
          }));

        if (receiptParticipants.length > 0) {
          await supabase.from('receipt_participants').insert(receiptParticipants);
        }
      }
    }

    // Buscar dados completos do recibo incluindo o participante criador
    const receiptData = await fetchReceiptData(supabase, receipt.id);

    return NextResponse.json(
      {
            receipt: {
              ...receipt,
              participants: receiptData.participants,
              pending_participants: receiptData.pendingParticipants,
              items: receiptData.items,
              deletion_requests: receiptData.deletionRequests,
            },
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

