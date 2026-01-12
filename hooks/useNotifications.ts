'use client';

import { useNotificationsContext } from '@/contexts/NotificationsContext';

/**
 * Hook para acessar o contexto de notificações
 */
export function useNotifications() {
  return useNotificationsContext();
}

/**
 * Hook para obter apenas o contador de notificações não lidas
 */
export function useUnreadCount(): number {
  const { unreadCount } = useNotificationsContext();
  return unreadCount;
}
