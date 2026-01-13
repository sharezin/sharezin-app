import { SupabaseClient } from '@supabase/supabase-js';
import { NotificationType } from '@/types';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  receiptId?: string;
  relatedUserId?: string;
}

/**
 * Cria uma nova notificação no banco de dados
 */
export async function createNotification(
  supabase: SupabaseClient,
  params: CreateNotificationParams
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      receipt_id: params.receiptId || null,
      related_user_id: params.relatedUserId || null,
      is_read: false,
    });

  if (error) {
    throw new Error('Erro ao criar notificação');
  }
}

/**
 * Formata o contador de notificações para exibição no badge
 * - 0: não mostra badge
 * - 1-99: mostra número exato
 * - >99: mostra "99+"
 */
export function formatNotificationCount(count: number): string {
  if (count <= 0) return '';
  if (count <= 99) return count.toString();
  return '99+';
}
