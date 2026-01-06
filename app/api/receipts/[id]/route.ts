import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, createAuthResponse } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';

// GET /api/receipts/[id] - Buscar recibo por ID
// Assinatura compatível com tipos do Next.js/Turbopack no build da Vercel
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const user = await getAuthUser(request);
  if (!user) {
    return createAuthResponse('Não autenticado');
  }

  try {
    const supabase = createServerClient();
    const receiptId = resolvedParams.id;

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

    const participantIds = (userParticipants || []).map((p: { id: string }) => p.id);
    
    let hasAccess: boolean = isCreator;
    
    if (!hasAccess && participantIds.length > 0) {
      const { data: participantCheck } = await supabase
        .from('receipt_participants')
        .select('participant_id')
        .eq('receipt_id', receiptId)
        .in('participant_id', participantIds);
      
      const hasParticipant = Array.isArray(participantCheck) && participantCheck.length > 0;
      hasAccess = hasParticipant;
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

    // Buscar dados dos participantes do recibo
    const receiptParticipantIds = participantsResult.data?.map(p => p.participant_id) || [];
    const { data: participants } = receiptParticipantIds.length > 0
      ? await supabase.from('participants').select('*').in('id', receiptParticipantIds)
      : { data: [] };

    return NextResponse.json({
      receipt: {
        ...receipt,
        items: itemsResult.data || [],
        participants: participants || [],
        pending_participants: pendingParticipantsResult.data || [],
        deletion_requests: deletionRequestsResult.data || [],
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}

// PUT /api/receipts/[id] - Atualizar recibo
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
    const supabase = createServerClient();
    const receiptId = resolvedParams.id;

    // Verificar se é o criador ou participante
    const { data: receipt } = await supabase
      .from('receipts')
      .select('creator_id, is_closed')
      .eq('id', receiptId)
      .single();

    if (!receipt) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Recibo não encontrado' },
        { status: 404 }
      );
    }

    const isCreator = receipt.creator_id === user.id;
    
    // Verificar se é participante
    let isParticipant = false;
    if (!isCreator) {
      const { data: userParticipants } = await supabase
        .from('participants')
        .select('id')
        .eq('user_id', user.id);

      const participantIds = (userParticipants || []).map((p: { id: string }) => p.id);
      
      if (participantIds.length > 0) {
        const { data: participantCheck } = await supabase
          .from('receipt_participants')
          .select('participant_id')
          .eq('receipt_id', receiptId)
          .in('participant_id', participantIds);
        
        isParticipant = Array.isArray(participantCheck) && participantCheck.length > 0;
      }
    }

    // Verificar se tem permissão (criador ou participante)
    if (!isCreator && !isParticipant) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão para atualizar este recibo' },
        { status: 403 }
      );
    }

    // Verificar se o recibo está fechado
    if (receipt.is_closed && !isCreator) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Não é possível adicionar produtos a um recibo fechado' },
        { status: 403 }
      );
    }

    // Apenas o criador pode modificar campos do recibo (título, taxa, cover, fechar, etc.)
    // Participantes só podem adicionar itens
    const canModifyReceipt = isCreator;

    // Atualizar recibo (apenas criador pode modificar campos do recibo)
    const updateData: {
      updated_at: string;
      title?: string;
      service_charge_percent?: number;
      cover?: number;
      is_closed?: boolean;
      total?: number;
    } = {
      updated_at: new Date().toISOString(),
    };

    // Apenas o criador pode modificar campos do recibo
    if (canModifyReceipt) {
      if (body.title !== undefined) updateData.title = body.title;
      if (body.serviceChargePercent !== undefined) updateData.service_charge_percent = body.serviceChargePercent;
      if (body.cover !== undefined) updateData.cover = body.cover;
      if (body.isClosed !== undefined) updateData.is_closed = body.isClosed;
      if (body.total !== undefined) updateData.total = body.total;
    } else {
      // Participantes só podem atualizar o total (calculado automaticamente)
      if (body.total !== undefined) updateData.total = body.total;
    }

    const { data: updatedReceipt, error: receiptError } = await supabase
      .from('receipts')
      .update(updateData)
      .eq('id', receiptId)
      .select()
      .single();

    if (receiptError) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Erro ao atualizar recibo' },
        { status: 500 }
      );
    }

    // Salvar participantes e itens se fornecidos
    if (body.participants !== undefined && Array.isArray(body.participants)) {
      // Para cada participante, criar ou atualizar na tabela participants
      for (const participant of body.participants) {
        // Verificar se o participante já existe
        const { data: existingParticipant } = await supabase
          .from('participants')
          .select('id')
          .eq('id', participant.id)
          .single();

        if (!existingParticipant) {
          // Criar novo participante
          // Se o ID do participante é um UUID válido, usar como user_id
          // Caso contrário, pode ser um participante temporário sem user_id
          const participantData: {
            id: string;
            name: string;
            user_id?: string;
            is_closed: boolean;
          } = {
            id: participant.id,
            name: participant.name,
            is_closed: participant.isClosed || false,
          };

          // Se o participante tem um ID que parece ser de usuário (UUID), usar esse ID como user_id
          // Isso permite que participantes aceitos possam acessar o recibo
          // Caso contrário, deixar user_id como NULL (participante temporário do recibo)
          if (participant.id && participant.id !== 'default-user' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(participant.id)) {
            participantData.user_id = participant.id;
          }

          const { error: participantError } = await supabase
            .from('participants')
            .insert(participantData);

          if (participantError) {
            // Se o erro for de duplicação, tentar atualizar
            if (participantError.code === '23505') {
              await supabase
                .from('participants')
                .update({
                  name: participant.name,
                  is_closed: participant.isClosed || false,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', participant.id);
            }
          }
        } else {
          // Atualizar participante existente
          // Se o participante tem um ID que parece ser de usuário (UUID), garantir que o user_id está correto
          const updateData: {
            name: string;
            is_closed: boolean;
            updated_at: string;
            user_id?: string;
          } = {
            name: participant.name,
            is_closed: participant.isClosed || false,
            updated_at: new Date().toISOString(),
          };

          // Se o participante tem um ID que parece ser de usuário (UUID), atualizar o user_id também
          if (participant.id && participant.id !== 'default-user' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(participant.id)) {
            updateData.user_id = participant.id;
          }

          await supabase
            .from('participants')
            .update(updateData)
            .eq('id', participant.id);
        }

        // Garantir que o participante está associado ao recibo
        const { data: receiptParticipant } = await supabase
          .from('receipt_participants')
          .select('id')
          .eq('receipt_id', receiptId)
          .eq('participant_id', participant.id)
          .single();

        if (!receiptParticipant) {
          await supabase
            .from('receipt_participants')
            .insert({
              receipt_id: receiptId,
              participant_id: participant.id,
            });
        }
      }

      // Remover participantes que não estão mais na lista
      const currentParticipantIds = body.participants.map((p: { id: string }) => p.id);
      const { data: allReceiptParticipants } = await supabase
        .from('receipt_participants')
        .select('participant_id')
        .eq('receipt_id', receiptId);

      const participantsToRemove = (allReceiptParticipants || [])
        .map((p: { participant_id: string }) => p.participant_id)
        .filter((id: string) => !currentParticipantIds.includes(id));

      if (participantsToRemove.length > 0) {
        await supabase
          .from('receipt_participants')
          .delete()
          .eq('receipt_id', receiptId)
          .in('participant_id', participantsToRemove);
      }
    }

    // Salvar pendingParticipants se fornecidos
    if (body.pendingParticipants !== undefined && Array.isArray(body.pendingParticipants)) {
      // Remover pendingParticipants que não estão mais na lista
      const currentPendingParticipantIds = body.pendingParticipants.map((p: { id: string }) => p.id);
      const { data: existingPendingParticipants } = await supabase
        .from('pending_participants')
        .select('id')
        .eq('receipt_id', receiptId);

      const pendingParticipantsToRemove = (existingPendingParticipants || [])
        .map((p: { id: string }) => p.id)
        .filter((id: string) => !currentPendingParticipantIds.includes(id));

      if (pendingParticipantsToRemove.length > 0) {
        await supabase
          .from('pending_participants')
          .delete()
          .eq('receipt_id', receiptId)
          .in('id', pendingParticipantsToRemove);
      }

      // Inserir ou atualizar pendingParticipants
      for (const pending of body.pendingParticipants) {
        const { data: existingPending } = await supabase
          .from('pending_participants')
          .select('id')
          .eq('id', pending.id)
          .single();

        if (!existingPending) {
          await supabase
            .from('pending_participants')
            .insert({
              id: pending.id,
              receipt_id: receiptId,
              name: pending.name,
              user_id: pending.userId,
              requested_at: pending.requestedAt,
            });
        } else {
          await supabase
            .from('pending_participants')
            .update({
              name: pending.name,
              user_id: pending.userId,
              requested_at: pending.requestedAt,
            })
            .eq('id', pending.id);
        }
      }
    }

    // Salvar deletionRequests se fornecidos
    if (body.deletionRequests !== undefined && Array.isArray(body.deletionRequests)) {
      // Remover deletionRequests que não estão mais na lista
      const currentDeletionRequestIds = body.deletionRequests.map((dr: { id: string }) => dr.id);
      const { data: existingDeletionRequests } = await supabase
        .from('deletion_requests')
        .select('id')
        .eq('receipt_id', receiptId);

      const deletionRequestsToRemove = (existingDeletionRequests || [])
        .map((dr: { id: string }) => dr.id)
        .filter((id: string) => !currentDeletionRequestIds.includes(id));

      if (deletionRequestsToRemove.length > 0) {
        await supabase
          .from('deletion_requests')
          .delete()
          .eq('receipt_id', receiptId)
          .in('id', deletionRequestsToRemove);
      }

      // Inserir ou atualizar deletionRequests
      for (const deletionRequest of body.deletionRequests) {
        const { data: existingDeletionRequest } = await supabase
          .from('deletion_requests')
          .select('id')
          .eq('id', deletionRequest.id)
          .single();

        if (!existingDeletionRequest) {
          // Verificar se o item existe antes de criar solicitação
          const { data: itemExists } = await supabase
            .from('receipt_items')
            .select('id')
            .eq('id', deletionRequest.itemId)
            .eq('receipt_id', receiptId)
            .single();

          if (itemExists) {
            await supabase
              .from('deletion_requests')
              .insert({
                id: deletionRequest.id,
                receipt_id: receiptId,
                item_id: deletionRequest.itemId,
                participant_id: deletionRequest.participantId,
                requested_at: deletionRequest.requestedAt,
              });
          }
        } else {
          await supabase
            .from('deletion_requests')
            .update({
              item_id: deletionRequest.itemId,
              participant_id: deletionRequest.participantId,
              requested_at: deletionRequest.requestedAt,
            })
            .eq('id', deletionRequest.id);
        }
      }
    }

    // Salvar itens se fornecidos
    if (body.items !== undefined && Array.isArray(body.items)) {
      // Buscar itens existentes
      const { data: existingItems } = await supabase
        .from('receipt_items')
        .select('id')
        .eq('receipt_id', receiptId);

      const existingItemIds = new Set((existingItems || []).map((item: { id: string }) => item.id));
      const newItemIds = new Set(body.items.map((item: { id: string }) => item.id));

      // Deletar itens que não estão mais na lista
      const itemsToDelete = Array.from(existingItemIds).filter(id => !newItemIds.has(id));
      if (itemsToDelete.length > 0) {
        await supabase
          .from('receipt_items')
          .delete()
          .in('id', itemsToDelete);
      }

      // Inserir ou atualizar itens
      if (body.items.length > 0) {
        const itemsToUpsert = body.items.map((item: { id: string; name: string; quantity: number; price: number; participantId: string; addedAt?: string }) => ({
          id: item.id,
          receipt_id: receiptId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          participant_id: item.participantId,
          added_at: item.addedAt || new Date().toISOString(),
        }));

        await supabase
          .from('receipt_items')
          .upsert(itemsToUpsert, { onConflict: 'id' })
          .select();
      }

      // Remover automaticamente solicitações de exclusão cujos itens foram deletados
      if (itemsToDelete.length > 0) {
        await supabase
          .from('deletion_requests')
          .delete()
          .eq('receipt_id', receiptId)
          .in('item_id', itemsToDelete);
      }
    }

    // Buscar dados atualizados para retornar
    const [itemsResult, participantsResult, pendingParticipantsResult, deletionRequestsResult] = await Promise.all([
      supabase.from('receipt_items').select('*').eq('receipt_id', receiptId),
      supabase.from('receipt_participants').select('participant_id').eq('receipt_id', receiptId),
      supabase.from('pending_participants').select('*').eq('receipt_id', receiptId),
      supabase.from('deletion_requests').select('*').eq('receipt_id', receiptId),
    ]);

    const receiptParticipantIds = participantsResult.data?.map(p => p.participant_id) || [];
    const { data: participants } = receiptParticipantIds.length > 0
      ? await supabase.from('participants').select('*').in('id', receiptParticipantIds)
      : { data: [] };

    return NextResponse.json({
      receipt: {
        ...updatedReceipt,
        items: itemsResult.data || [],
        participants: participants || [],
        pending_participants: pendingParticipantsResult.data || [],
        deletion_requests: deletionRequestsResult.data || [],
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}

// DELETE /api/receipts/[id] - Excluir recibo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const user = await getAuthUser(request);
  if (!user) {
    return createAuthResponse('Não autenticado');
  }

  try {
    const supabase = createServerClient();
    const receiptId = resolvedParams.id;

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
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Erro ao excluir recibo' },
        { status: 500 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}

