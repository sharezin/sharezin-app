'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Notification } from '@/types';
import { supabase } from '@/lib/supabase';

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  pagination: PaginationInfo | null;
  loadNotifications: (page?: number, unreadOnly?: boolean) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  
  // Refs para gerenciar Realtime e polling
  const channelRef = useRef<any>(null);
  const realtimeFailedRef = useRef<boolean>(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadNotifications = useCallback(async (page: number = 1, unreadOnly: boolean = false) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token || !user?.id) {
      setNotifications([]);
      setLoading(false);
      setPagination(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const url = unreadOnly 
        ? `/api/notifications?unreadOnly=true&page=${page}`
        : `/api/notifications?page=${page}`;
      
      const data = await apiRequest<{ notifications: Notification[]; pagination: PaginationInfo }>(url);
      
      // Transformar snake_case para camelCase
      const transformedNotifications = data.notifications.map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        type: n.type,
        title: n.title,
        message: n.message,
        receiptId: n.receipt_id,
        relatedUserId: n.related_user_id,
        isRead: n.is_read,
        createdAt: n.created_at,
        updatedAt: n.updated_at,
      }));
      
      setNotifications(transformedNotifications);
      setPagination(data.pagination || null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar notificações';
      setError(errorMessage);
      setNotifications([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await apiRequest(`/api/notifications/${notificationId}`, {
        method: 'PUT',
      });

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      // Erro ao marcar notificação como lida
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await apiRequest('/api/notifications', {
        method: 'PUT',
        body: JSON.stringify({ markAllAsRead: true }),
      });

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      // Erro ao marcar todas como lidas
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await apiRequest(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      // Erro ao deletar notificação
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    await loadNotifications(1, false);
  }, [loadNotifications]);

  // Função helper para transformar notificação do banco para o formato esperado
  const transformNotification = useCallback((n: any): Notification => ({
    id: n.id,
    userId: n.user_id,
    type: n.type,
    title: n.title,
    message: n.message,
    receiptId: n.receipt_id,
    relatedUserId: n.related_user_id,
    isRead: n.is_read,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  }), []);

  // Carregar notificações quando usuário estiver autenticado (apenas primeira página)
  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setPagination(null);
      return;
    }

    // Limpar conexões anteriores
    if (channelRef.current) {
      supabase?.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    realtimeFailedRef.current = false;

    // Carregar notificações iniciais
    loadNotifications(1, false);

    // Tentar conectar ao Realtime (apenas uma vez por carregamento de página)
    if (supabase && !realtimeFailedRef.current) {
      try {
        const channel = supabase
          .channel(`notifications:${user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`,
            },
            (payload: { eventType: string; new?: any; old?: any }) => {
              // Atualizar notificações quando houver mudanças
              if (payload.eventType === 'INSERT') {
                const newNotification = transformNotification(payload.new);
                setNotifications((prev) => {
                  // Evitar duplicatas
                  if (prev.some((n) => n.id === newNotification.id)) {
                    return prev;
                  }
                  // Adicionar no início (mais recente primeiro)
                  return [newNotification, ...prev];
                });
                // Atualizar paginação apenas quando há nova notificação
                setPagination((prev) => 
                  prev ? { ...prev, total: prev.total + 1 } : null
                );
              } else if (payload.eventType === 'UPDATE') {
                const updatedNotification = transformNotification(payload.new);
                setNotifications((prev) =>
                  prev.map((n) =>
                    n.id === updatedNotification.id ? updatedNotification : n
                  )
                );
              } else if (payload.eventType === 'DELETE') {
                setNotifications((prev) =>
                  prev.filter((n) => n.id !== payload.old.id)
                );
                // Atualizar paginação quando há exclusão
                setPagination((prev) => 
                  prev ? { ...prev, total: Math.max(0, prev.total - 1) } : null
                );
              }
              // Não precisa recarregar tudo - o Realtime já atualiza o estado localmente
            }
          )
          .subscribe((status: 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED') => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              realtimeFailedRef.current = true;
              // Fallback para polling se Realtime falhar (a cada 60 segundos para reduzir carga)
              if (!pollingIntervalRef.current) {
                pollingIntervalRef.current = setInterval(() => {
                  // Só fazer polling se a página estiver visível
                  if (document.visibilityState === 'visible') {
                    loadNotifications(1, false);
                  }
                }, 60000); // Aumentado para 60 segundos
              }
            }
          });

        channelRef.current = channel;
      } catch (err) {
        realtimeFailedRef.current = true;
        // Fallback para polling (a cada 60 segundos para reduzir carga)
        if (!pollingIntervalRef.current) {
          pollingIntervalRef.current = setInterval(() => {
            // Só fazer polling se a página estiver visível
            if (document.visibilityState === 'visible') {
              loadNotifications(1, false);
            }
          }, 60000); // Aumentado para 60 segundos
        }
      }
    } else {
      // Se Realtime já falhou antes ou não está disponível, usar polling
      if (!pollingIntervalRef.current) {
        pollingIntervalRef.current = setInterval(() => {
          // Só fazer polling se a página estiver visível
          if (document.visibilityState === 'visible') {
            loadNotifications(1, false);
          }
        }, 60000); // Aumentado para 60 segundos
      }
    }

    // Adicionar listener para pausar polling quando a página não estiver visível
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && pollingIntervalRef.current) {
        // Pausar polling quando a página não estiver visível
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      } else if (document.visibilityState === 'visible' && !pollingIntervalRef.current && realtimeFailedRef.current) {
        // Retomar polling quando a página voltar a ficar visível (apenas se Realtime falhou)
        pollingIntervalRef.current = setInterval(() => {
          loadNotifications(1, false);
        }, 60000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase?.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, loadNotifications, transformNotification]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        pagination,
        loadNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotificationsContext must be used within a NotificationsProvider');
  }
  return context;
}
