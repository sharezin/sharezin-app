'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from '@/components/NotificationItem';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';

export default function NotificationsPage() {
  const { notifications, loading, error, pagination, markAllAsRead, refreshNotifications, loadNotifications } = useNotifications();
  const [currentPage, setCurrentPage] = useState(1);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Sincronizar currentPage com pagination da API
  useEffect(() => {
    if (pagination) {
      setCurrentPage(pagination.page);
    }
  }, [pagination]);

  const handlePageChange = async (page: number) => {
    setCurrentPage(page);
    await loadNotifications(page, false);
    // Scroll para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount > 0) {
      await markAllAsRead();
      // Recarregar página atual após marcar como lidas
      await loadNotifications(currentPage, false);
    }
  };

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <BackButton />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-text-primary">
                Notificações
              </h1>
            </div>
            {unreadCount > 0 && (
              <Button
                onClick={handleMarkAllAsRead}
                variant="secondary"
                size="sm"
              >
                Marcar todas como lidas
              </Button>
            )}
          </div>
          {unreadCount > 0 && (
            <p className="text-text-secondary text-sm">
              {unreadCount} {unreadCount === 1 ? 'notificação não lida' : 'notificações não lidas'}
            </p>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-2">
              <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-text-secondary">Carregando notificações...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <Button
              onClick={refreshNotifications}
              variant="secondary"
              size="sm"
              className="mt-2"
            >
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && notifications.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto text-text-muted mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <p className="text-text-secondary mb-2">Nenhuma notificação</p>
            <p className="text-sm text-text-muted">
              Você será notificado quando houver novas atualizações
            </p>
          </div>
        )}

        {/* Notifications List */}
        {!loading && !error && notifications.length > 0 && (
          <>
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              {notifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-text-secondary">
                  Página {pagination.page} de {pagination.totalPages} • {pagination.total} notificações
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    variant="secondary"
                    size="sm"
                  >
                    Anterior
                  </Button>
                  
                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          disabled={loading}
                          variant={currentPage === pageNum ? 'primary' : 'secondary'}
                          size="sm"
                          className="min-w-[40px]"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.hasMore || loading}
                    variant="secondary"
                    size="sm"
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
