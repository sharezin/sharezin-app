'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useNotificationsContext } from '@/contexts/NotificationsContext';
import { Notification } from '@/types';
import { X } from 'lucide-react';

export function NotificationAlert() {
  const { notifications } = useNotificationsContext();
  const router = useRouter();
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const previousNotificationIdsRef = useRef<Set<string>>(new Set());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef<boolean>(false);

  // Inicializar com notificações existentes quando o componente montar ou quando as notificações mudarem pela primeira vez
  // IMPORTANTE: Inicializar mesmo quando não há notificações para permitir detecção de novas
  useEffect(() => {
    // Se ainda não inicializou, inicializar agora com as notificações atuais
    if (!isInitializedRef.current) {
      const currentIds = new Set(notifications.map(n => n.id));
      previousNotificationIdsRef.current = currentIds;
      isInitializedRef.current = true;
      return; // Retornar para não processar na primeira vez (evitar mostrar notificações antigas)
    }

    // Encontrar a notificação mais recente não lida
    const unreadNotifications = notifications.filter(n => !n.isRead);
    
    if (unreadNotifications.length === 0) {
      return;
    }

    // Ordenar por data de criação (mais recente primeiro)
    const sortedUnread = [...unreadNotifications].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const latestNotification = sortedUnread[0];

    // Verificar se é uma notificação nova (não estava na lista anterior)
    if (latestNotification && !previousNotificationIdsRef.current.has(latestNotification.id)) {
      // Adicionar ao conjunto de IDs conhecidos ANTES de exibir (para evitar duplicatas)
      previousNotificationIdsRef.current.add(latestNotification.id);
      
      // Limpar timer anterior se existir
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Mostrar nova notificação
      setCurrentNotification(latestNotification);
      setIsVisible(true);

      // Auto-fechar após 5 segundos
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        // Limpar após animação
        setTimeout(() => {
          setCurrentNotification(null);
        }, 300);
      }, 5000);
    }

    // Atualizar o conjunto de IDs conhecidos com todas as notificações atuais
    // Isso garante que notificações já conhecidas não sejam exibidas novamente
    // E remove IDs de notificações que foram deletadas
    const currentIds = new Set(notifications.map(n => n.id));
    // Manter apenas os IDs que ainda existem na lista atual
    previousNotificationIdsRef.current = new Set(
      Array.from(previousNotificationIdsRef.current).filter(id => currentIds.has(id))
    );

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [notifications]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setCurrentNotification(null);
    }, 300);
  };

  const handleClick = () => {
    if (currentNotification?.receiptId) {
      router.push(`/receipt/${currentNotification.receiptId}`);
    } else {
      router.push('/notifications');
    }
    handleClose();
  };

  if (!currentNotification || !isVisible) {
    return null;
  }

  return (
    <div 
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4 transition-all duration-300 ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}
    >
      <Alert 
        className="cursor-pointer shadow-lg border-border-strong bg-bg hover:bg-secondary-soft transition-colors"
        onClick={handleClick}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="absolute right-2 top-2 p-1 rounded-md hover:bg-secondary-hover transition-colors"
          aria-label="Fechar"
        >
          <X className="h-4 w-4 text-text-secondary" />
        </button>
        <AlertTitle className="pr-6">{currentNotification.title}</AlertTitle>
        <AlertDescription className="pr-6">
          {currentNotification.message}
        </AlertDescription>
      </Alert>
    </div>
  );
}
