'use client';

import { useEffect, useRef, useState } from 'react';
import { useReceipts } from '@/hooks/useReceipts';
import { useAuth } from '@/hooks/useAuth';
import { useUserPlan } from '@/hooks/useUserPlan';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import Link from 'next/link';
import { ReceiptCard } from '@/components/ui/ReceiptCard';
import { EmptyState } from '@/components/ui/EmptyState';
import dynamic from 'next/dynamic';

const PlansModal = dynamic(() => import('@/components/PlansModal').then(mod => ({ default: mod.PlansModal })), {
  ssr: false,
});

export default function HistoryPage() {
  const { receipts, loading, loadClosedReceipts } = useReceipts();
  const { user } = useAuth();
  const { plan } = useUserPlan();
  const [showPlansModal, setShowPlansModal] = useState(false);
  const hasLoadedRef = useRef(false);

  // Pull-to-refresh para atualizar recibos fechados
  const { isRefreshing, pullDistance, pullProgress } = usePullToRefresh({
    onRefresh: async () => {
      if (user?.id) {
        await loadClosedReceipts();
      }
    },
    enabled: !!user?.id && !loading,
  });

  // Carrega apenas recibos fechados quando o componente monta ou o usuário muda
  useEffect(() => {
    if (user?.id && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadClosedReceipts();
    }
  }, [user?.id, loadClosedReceipts]);

  // Reset flag quando o usuário mudar
  useEffect(() => {
    if (!user?.id) {
      hasLoadedRef.current = false;
    }
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center pb-20">
        <p className="text-text-secondary">Carregando...</p>
      </div>
    );
  }

  // Filtra apenas recibos fechados
  const closedReceipts = receipts.filter(receipt => receipt.isClosed);
  
  // Verificar se há limite de histórico e se foi atingido
  const hasHistoryLimit = plan?.maxHistoryReceipts !== null;
  const isHistoryLimited = hasHistoryLimit && closedReceipts.length >= (plan?.maxHistoryReceipts || 0);

  // Agrupa recibos por data
  const groupedByDate = closedReceipts.reduce((acc, receipt) => {
    const date = new Date(receipt.date).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(receipt);
    return acc;
  }, {} as Record<string, typeof receipts>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
    // Converte as strings de data para Date para comparar
    const dateA = new Date(a.split(' de ').reverse().join('-'));
    const dateB = new Date(b.split(' de ').reverse().join('-'));
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <div className="min-h-screen bg-bg pb-20 relative">
      {/* Indicador de pull-to-refresh */}
      {pullDistance > 0 && (
        <div 
          className="fixed top-0 left-0 right-0 flex items-center justify-center z-50 transition-opacity duration-200"
          style={{
            transform: `translateY(${Math.min(pullDistance, 80)}px)`,
            opacity: Math.min(pullProgress, 1),
          }}
        >
          <div className="bg-primary text-text-inverse px-4 py-2 rounded-b-lg shadow-2xl flex items-center gap-2 border-b-2 border-primary">
            {isRefreshing ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm font-medium">Atualizando...</span>
              </>
            ) : (
              <>
                <svg 
                  className="h-5 w-5 transition-transform duration-200" 
                  style={{ transform: `rotate(${pullProgress * 180}deg)` }}
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span className="text-sm font-medium">
                  {pullProgress >= 1 ? 'Solte para atualizar' : 'Puxe para atualizar'}
                </span>
              </>
            )}
          </div>
        </div>
      )}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Histórico de Recibos
          </h1>
          <p className="text-text-secondary">
            Todos os recibos criados e participados
          </p>
        </div>

        {isHistoryLimited && (
          <div className="bg-warning/10 rounded-lg p-4 mb-6 border border-warning/30">
            <p className="text-sm text-text-primary mb-2">
              ⚠️ Você está visualizando apenas os últimos {plan?.maxHistoryReceipts} recibos fechados do plano {plan?.planDisplayName}.
            </p>
            <button
              onClick={() => setShowPlansModal(true)}
              className="text-sm text-primary hover:underline font-medium"
            >
              Fazer upgrade para Premium →
            </button>
          </div>
        )}

        {closedReceipts.length === 0 ? (
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            title="Nenhum recibo no histórico"
          />
        ) : (
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
        )}
      </div>

      <PlansModal
        isOpen={showPlansModal}
        onClose={() => setShowPlansModal(false)}
        onUpgrade={() => {
          setShowPlansModal(false);
          window.location.reload();
        }}
      />
    </div>
  );
}

