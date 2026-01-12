'use client';

import { Notification } from '@/types';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationItemProps {
  notification: Notification;
}

// Tipos de notificação que permitem navegação para o recibo
const NAVIGABLE_NOTIFICATION_TYPES: Notification['type'][] = [
  'participant_request',
  'participant_approved',
  'deletion_request',
  'deletion_approved',
];

export function NotificationItem({ notification }: NotificationItemProps) {
  const router = useRouter();
  const { markAsRead, deleteNotification } = useNotifications();

  const canNavigate = NAVIGABLE_NOTIFICATION_TYPES.includes(notification.type) && notification.receiptId;

  const handleClick = () => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    if (canNavigate) {
      router.push(`/receipt/${notification.receiptId}`);
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(notification.id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Agora';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} min atrás`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h atrás`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} dia${days > 1 ? 's' : ''} atrás`;
    } else {
      return date.toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  return (
    <div
      className={`p-4 border-b border-border transition-colors ${
        canNavigate ? 'cursor-pointer' : 'cursor-default'
      } ${
        notification.isRead
          ? 'bg-surface hover:bg-secondary-hover'
          : 'bg-surface-alt hover:bg-secondary-hover'
      }`}
      onClick={canNavigate ? handleClick : undefined}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className={`font-medium text-sm ${notification.isRead ? 'text-text-secondary' : 'text-text-primary'}`}>
              {notification.title}
            </h3>
            {!notification.isRead && (
              <span className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-1.5" />
            )}
          </div>
          <p className="text-sm text-text-secondary mb-2 line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">
              {formatDate(notification.createdAt)}
            </span>
            <div className="flex items-center gap-2">
              {!notification.isRead && (
                <button
                  onClick={handleMarkAsRead}
                  className="text-xs text-primary hover:text-primary-hover transition-colors"
                  title="Marcar como lida"
                >
                  Marcar como lida
                </button>
              )}
              <button
                onClick={handleDelete}
                className="text-xs text-text-muted hover:text-red-500 transition-colors"
                title="Deletar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
