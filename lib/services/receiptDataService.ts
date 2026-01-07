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
