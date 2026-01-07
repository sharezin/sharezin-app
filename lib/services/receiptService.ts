import { SupabaseClient } from '@supabase/supabase-js';
import { Participant, ReceiptItem, PendingParticipant, DeletionRequest } from '@/types';

/**
 * Upsert participantes no recibo
 */
export async function upsertReceiptParticipants(
  supabase: SupabaseClient,
  receiptId: string,
  participants: Participant[]
): Promise<void> {
  // Para cada participante, criar ou atualizar na tabela participants
  for (const participant of participants) {
    // Verificar se o participante já existe
    const { data: existingParticipant } = await supabase
      .from('participants')
      .select('id')
      .eq('id', participant.id)
      .single();

    if (!existingParticipant) {
      // Criar novo participante
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
  const currentParticipantIds = participants.map(p => p.id);
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

/**
 * Upsert pending participants no recibo
 */
export async function upsertPendingParticipants(
  supabase: SupabaseClient,
  receiptId: string,
  pendingParticipants: PendingParticipant[]
): Promise<void> {
  // Remover pendingParticipants que não estão mais na lista
  const currentPendingParticipantIds = pendingParticipants.map(p => p.id);
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
  for (const pending of pendingParticipants) {
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

/**
 * Upsert deletion requests no recibo
 */
export async function upsertDeletionRequests(
  supabase: SupabaseClient,
  receiptId: string,
  deletionRequests: DeletionRequest[]
): Promise<void> {
  // Remover deletionRequests que não estão mais na lista
  const currentDeletionRequestIds = deletionRequests.map(dr => dr.id);
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
  for (const deletionRequest of deletionRequests) {
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

/**
 * Upsert items no recibo
 */
export async function upsertReceiptItems(
  supabase: SupabaseClient,
  receiptId: string,
  items: ReceiptItem[]
): Promise<string[]> {
  // Buscar itens existentes
  const { data: existingItems } = await supabase
    .from('receipt_items')
    .select('id')
    .eq('receipt_id', receiptId);

  const existingItemIds = new Set((existingItems || []).map((item: { id: string }) => item.id));
  const newItemIds = new Set(items.map(item => item.id));

  // Deletar itens que não estão mais na lista
  const itemsToDelete = Array.from(existingItemIds).filter(id => !newItemIds.has(id));
  if (itemsToDelete.length > 0) {
    await supabase
      .from('receipt_items')
      .delete()
      .in('id', itemsToDelete);

    // Remover automaticamente solicitações de exclusão cujos itens foram deletados
    await supabase
      .from('deletion_requests')
      .delete()
      .eq('receipt_id', receiptId)
      .in('item_id', itemsToDelete);
  }

  // Inserir ou atualizar itens
  if (items.length > 0) {
    const itemsToUpsert = items.map(item => ({
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

  return itemsToDelete;
}

/**
 * Remove um participante do recibo e todos os seus produtos
 */
export async function removeParticipantFromReceipt(
  supabase: SupabaseClient,
  receiptId: string,
  participantId: string
): Promise<void> {
  // Buscar todos os produtos do participante
  const { data: participantItems } = await supabase
    .from('receipt_items')
    .select('id')
    .eq('receipt_id', receiptId)
    .eq('participant_id', participantId);

  const itemIds = (participantItems || []).map(item => item.id);

  // Remover deletion_requests relacionados aos produtos
  if (itemIds.length > 0) {
    await supabase
      .from('deletion_requests')
      .delete()
      .eq('receipt_id', receiptId)
      .in('item_id', itemIds);
  }

  // Remover produtos do participante
  if (itemIds.length > 0) {
    await supabase
      .from('receipt_items')
      .delete()
      .in('id', itemIds);
  }

  // Remover participante do recibo
  await supabase
    .from('receipt_participants')
    .delete()
    .eq('receipt_id', receiptId)
    .eq('participant_id', participantId);
}
