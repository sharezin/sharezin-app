import { SupabaseClient } from '@supabase/supabase-js';
import { Receipt, Participant, ReceiptItem, PendingParticipant, DeletionRequest } from '@/types';

export interface ReceiptData {
  items: ReceiptItem[];
  participants: Participant[];
  pendingParticipants: PendingParticipant[];
  deletionRequests: DeletionRequest[];
}

/**
 * Busca todos os dados relacionados a um recibo
 */
export async function fetchReceiptData(
  supabase: SupabaseClient,
  receiptId: string
): Promise<ReceiptData> {
  // Buscar dados relacionados em paralelo
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

  return {
    items: itemsResult.data || [],
    participants: participants || [],
    pendingParticipants: pendingParticipantsResult.data || [],
    deletionRequests: deletionRequestsResult.data || [],
  };
}

/**
 * Busca o user_id de um participante
 */
export async function getParticipantUserId(
  supabase: SupabaseClient,
  participantId: string
): Promise<string | null> {
  const { data: participant, error } = await supabase
    .from('participants')
    .select('user_id')
    .eq('id', participantId)
    .single();

  if (error || !participant) {
    return null;
  }

  return participant.user_id;
}

/**
 * Busca todos os participantes de um recibo com user_id (excluindo participantes sem user_id)
 */
export async function getReceiptParticipantsWithUserId(
  supabase: SupabaseClient,
  receiptId: string
): Promise<string[]> {
  const { data: receiptParticipants, error } = await supabase
    .from('receipt_participants')
    .select('participant_id')
    .eq('receipt_id', receiptId);

  if (error || !receiptParticipants || receiptParticipants.length === 0) {
    return [];
  }

  const participantIds = receiptParticipants.map(rp => rp.participant_id);

  const { data: participants, error: participantsError } = await supabase
    .from('participants')
    .select('user_id')
    .in('id', participantIds)
    .not('user_id', 'is', null);

  if (participantsError || !participants) {
    return [];
  }

  return participants
    .map(p => p.user_id)
    .filter((userId): userId is string => userId !== null);
}
