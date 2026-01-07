import { SupabaseClient } from '@supabase/supabase-js';

export interface ReceiptPermission {
  hasAccess: boolean;
  isCreator: boolean;
  isParticipant: boolean;
}

/**
 * Verifica se o usuário tem acesso ao recibo (é criador ou participante)
 */
export async function checkReceiptAccess(
  supabase: SupabaseClient,
  receiptId: string,
  userId: string
): Promise<ReceiptPermission> {
  // Buscar recibo para verificar se é criador
  const { data: receipt } = await supabase
    .from('receipts')
    .select('creator_id')
    .eq('id', receiptId)
    .single();

  if (!receipt) {
    return { hasAccess: false, isCreator: false, isParticipant: false };
  }

  const isCreator = receipt.creator_id === userId;

  // Se é criador, já tem acesso
  if (isCreator) {
    return { hasAccess: true, isCreator: true, isParticipant: false };
  }

  // Verificar se é participante
  const { data: userParticipants } = await supabase
    .from('participants')
    .select('id')
    .eq('user_id', userId);

  const participantIds = (userParticipants || []).map((p: { id: string }) => p.id);

  if (participantIds.length === 0) {
    return { hasAccess: false, isCreator: false, isParticipant: false };
  }

  const { data: participantCheck } = await supabase
    .from('receipt_participants')
    .select('participant_id')
    .eq('receipt_id', receiptId)
    .in('participant_id', participantIds);

  const isParticipant = Array.isArray(participantCheck) && participantCheck.length > 0;

  return {
    hasAccess: isParticipant,
    isCreator: false,
    isParticipant,
  };
}

/**
 * Verifica se o usuário pode modificar campos do recibo (apenas criador)
 */
export async function canModifyReceipt(
  supabase: SupabaseClient,
  receiptId: string,
  userId: string
): Promise<boolean> {
  const permission = await checkReceiptAccess(supabase, receiptId, userId);
  return permission.isCreator;
}

/**
 * Verifica se o usuário pode adicionar itens ao recibo (criador ou participante)
 */
export async function canAddItems(
  supabase: SupabaseClient,
  receiptId: string,
  userId: string
): Promise<boolean> {
  const permission = await checkReceiptAccess(supabase, receiptId, userId);
  return permission.hasAccess;
}

/**
 * Verifica se o usuário pode modificar o recibo e retorna informações sobre o estado do recibo
 */
export async function checkReceiptModificationPermission(
  supabase: SupabaseClient,
  receiptId: string,
  userId: string
): Promise<{ canModify: boolean; isCreator: boolean; isClosed: boolean }> {
  const { data: receipt, error: receiptError } = await supabase
    .from('receipts')
    .select('creator_id, is_closed')
    .eq('id', receiptId)
    .single();

  if (receiptError || !receipt) {
    return { canModify: false, isCreator: false, isClosed: false };
  }

  const isCreator = receipt.creator_id === userId;
  const isClosed = receipt.is_closed;

  return { canModify: isCreator, isCreator, isClosed };
}
