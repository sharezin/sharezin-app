'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Notification } from '@/types';

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
      console.error('Error marking notification as read:', err);
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
      console.error('Error marking all as read:', err);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await apiRequest(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    await loadNotifications(1, false);
  }, [loadNotifications]);

  // Carregar notificações quando usuário estiver autenticado (apenas primeira página)
  useEffect(() => {
    if (user?.id) {
      loadNotifications(1, false);
      
      // Polling a cada 30 segundos para atualizar notificações (apenas primeira página)
      const interval = setInterval(() => {
        loadNotifications(1, false);
      }, 30000);

      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setPagination(null);
    }
  }, [user?.id, loadNotifications]);

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
