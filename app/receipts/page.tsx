'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useReceiptsContext } from '@/contexts/ReceiptsContext';
import { useAuth } from '@/hooks/useAuth';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { ReceiptCard } from '@/components/ui/ReceiptCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { Receipt } from '@/types';
import dynamic from 'next/dynamic';

const DynamicCreateOrJoinReceiptModal = dynamic(() => import('@/components/CreateOrJoinReceiptModal').then(mod => ({ default: mod.CreateOrJoinReceiptModal })), {
  loading: () => null,
  ssr: false,
});

type FilterType = 'open' | 'closed';

export default function ReceiptsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { receipts, loading, loadReceipts } = useReceiptsContext();
  const { user } = useAuth();
  const [showCreateOrJoinModal, setShowCreateOrJoinModal] = useState(false);
  const [filter, setFilter] = useState<FilterType>('open');
  const [hasLoaded, setHasLoaded] = useState(false);
  const hasLoadedRef = useRef(false);
  const isRefreshingRef = useRef(false);
  
  // ID e nome do usuário atual
  const currentUserId = user?.id || '';
  const currentUserName = user?.name || 'Usuário';

  // Lê filtro da URL se existir
  useEffect(() => {
    const urlFilter = searchParams?.get('filter');
    if (urlFilter === 'closed' || urlFilter === 'open') {
      setFilter(urlFilter);
    }
  }, [searchParams]);

  // Função de refresh memoizada para evitar múltiplas chamadas
  const handleRefresh = useCallback(async () => {
    if (user?.id && !isRefreshingRef.current) {
      isRefreshingRef.current = true;
      try {
        await loadReceipts(true); // Carrega todos os recibos incluindo fechados
      } finally {
        isRefreshingRef.current = false;
      }
    }
  }, [user?.id, loadReceipts]);

  // Pull-to-refresh para atualizar recibos
  const { isRefreshing, pullDistance, pullProgress } = usePullToRefresh({
    onRefresh: handleRefresh,
    enabled: !!user?.id && !loading,
  });

  // Carrega recibos apenas se ainda não foram carregados (compartilhado com home)
  // Se já foram carregados na home, apenas usa os dados do contexto
  useEffect(() => {
    if (user?.id && pathname === '/receipts' && !hasLoadedRef.current && !isRefreshingRef.current) {
      hasLoadedRef.current = true;
      setHasLoaded(false);
      // Só carrega se não houver recibos no contexto (não foram carregados na home)
      if (receipts.length === 0) {
        loadReceipts(true).then(() => {
          setHasLoaded(true);
        }); // Carrega todos os recibos incluindo fechados
      } else {
        setHasLoaded(true);
      }
    }
  }, [user?.id, pathname, loadReceipts]);

  // Reset flag quando mudar de página ou usuário
  useEffect(() => {
    if (pathname !== '/receipts' || !user?.id) {
      hasLoadedRef.current = false;
      setHasLoaded(false);
    }
  }, [pathname, user?.id]);

  // Recarrega recibos quando a página volta a ficar visível (navegação de volta)
  // Mas não durante o pull-to-refresh
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' && 
        user?.id && 
        pathname === '/receipts' &&
        !isRefreshingRef.current
      ) {
        loadReceipts(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, pathname, loadReceipts]);

  // Filtra recibos baseado no filtro selecionado
  const filteredReceipts = receipts.filter((receipt: Receipt) => {
    if (filter === 'open') {
      return !receipt.isClosed;
    }
    return receipt.isClosed; // 'closed'
  });

  // Agrupa recibos fechados por data
  const groupedByDate = filter === 'closed' 
    ? filteredReceipts.reduce((acc, receipt) => {
        const dateKey = new Date(receipt.date).toLocaleDateString('pt-BR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(receipt);
        return acc;
      }, {} as Record<string, Receipt[]>)
    : {};

  // Ordena as datas (mais recente primeiro) usando a data do primeiro recibo de cada grupo
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
    // Pega a data do primeiro recibo de cada grupo para comparar
    const dateA = new Date(groupedByDate[a][0].date).getTime();
    const dateB = new Date(groupedByDate[b][0].date).getTime();
    return dateB - dateA;
  });

  const handleCreateReceipt = () => {
    setShowCreateOrJoinModal(true);
  };

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    // Atualiza URL sem recarregar página
    const params = new URLSearchParams(searchParams?.toString());
    params.set('filter', newFilter);
    router.replace(`/receipts?${params.toString()}`, { scroll: false });
  };

  if (loading && !hasLoaded) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-text-secondary">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-20 relative">
      {/* Indicador de pull-to-refresh */}
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        pullProgress={pullProgress}
        isRefreshing={isRefreshing}
      />
      
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-text-primary">
              Recibos
            </h1>
          </div>

          {/* Filtros */}
          <div className="flex gap-2">
            <button
              onClick={() => handleFilterChange('open')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'open'
                  ? 'bg-primary text-text-inverse'
                  : 'bg-surface border border-border text-text-primary hover:bg-secondary-hover'
              }`}
            >
              Abertos
            </button>
            <button
              onClick={() => handleFilterChange('closed')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'closed'
                  ? 'bg-primary text-text-inverse'
                  : 'bg-surface border border-border text-text-primary hover:bg-secondary-hover'
              }`}
            >
              Fechados
            </button>
          </div>
        </div>

        {filteredReceipts.length === 0 ? (
          <EmptyState
            icon={
              <svg
                className="h-16 w-16 text-text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            }
            title={
              filter === 'closed'
                ? 'Nenhum recibo fechado'
                : 'Nenhum recibo aberto'
            }
            description={
              filter === 'closed'
                ? 'Você ainda não possui recibos fechados'
                : 'Crie um novo recibo ou busque um recibo existente usando o código de convite'
            }
          />
        ) : filter === 'closed' && sortedDates.length > 0 ? (
          // Renderiza recibos fechados agrupados por data
          <div className="space-y-6">
            {sortedDates.map(date => (
              <div key={date}>
                <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase">
                  {date}
                </h2>
                <div className="space-y-3">
                  {groupedByDate[date]
                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                    .map(receipt => (
                      <ReceiptCard
                        key={receipt.id}
                        receipt={receipt}
                        href={`/receipt/${receipt.id}`}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Renderiza recibos abertos normalmente
          <div className="space-y-3">
            {filteredReceipts
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map(receipt => (
                <ReceiptCard
                  key={receipt.id}
                  receipt={receipt}
                  href={`/receipt/${receipt.id}`}
                />
              ))}
          </div>
        )}
      </div>

      {showCreateOrJoinModal && (
        <DynamicCreateOrJoinReceiptModal
          isOpen={showCreateOrJoinModal}
          onClose={() => setShowCreateOrJoinModal(false)}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
        />
      )}

      {/* Floating Action Button */}
      <button
        onClick={handleCreateReceipt}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-primary text-text-inverse font-medium hover:bg-primary-hover transition-colors shadow-lg hover:shadow-xl flex items-center justify-center z-[60]"
        aria-label="Adicionar recibo"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
    </div>
  );
}
