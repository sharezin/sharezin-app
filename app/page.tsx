'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useReceiptsContext } from '@/contexts/ReceiptsContext';
import { useAuth } from '@/hooks/useAuth';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { StatCard } from '@/components/ui/StatCard';
import { ChartCard } from '@/components/ui/ChartCard';
import { OpenReceiptsAlert } from '@/components/ui/OpenReceiptsAlert';
import { formatCurrency } from '@/lib/calculations';
import { Receipt } from '@/types';
import dynamic from 'next/dynamic';

const DynamicSearchReceipt = dynamic(() => import('@/components/SearchReceipt').then(mod => ({ default: mod.SearchReceipt })), {
  loading: () => null,
  ssr: false,
});

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const { receipts, loading, loadReceipts } = useReceiptsContext();
  const { user } = useAuth();
  const [showSearch, setShowSearch] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const hasLoadedRef = useRef(false);
  
  // ID e nome do usuário atual
  const currentUserId = user?.id || '';
  const currentUserName = user?.name || 'Usuário';

  // Pull-to-refresh para atualizar recibos
  const { isRefreshing, pullDistance, pullProgress } = usePullToRefresh({
    onRefresh: async () => {
      if (user?.id) {
        await loadReceipts(true); // Carrega todos os recibos incluindo fechados
      }
    },
    enabled: !!user?.id && !loading,
  });

  // Carrega todos os recibos (incluindo fechados) para estatísticas
  // Esta requisição será compartilhada com a tela de recibos
  useEffect(() => {
    if (user?.id && pathname === '/' && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      setIsInitialLoad(true);
      // Usa setTimeout para evitar setState síncrono dentro de effect
      setTimeout(() => {
        loadReceipts(true).then(() => {
          setIsInitialLoad(false);
        });
      }, 0);
    }
  }, [user?.id, pathname, loadReceipts]);

  // Reset flag quando mudar de página ou usuário
  useEffect(() => {
    if (pathname !== '/' || !user?.id) {
      hasLoadedRef.current = false;
      // Usa setTimeout para evitar setState síncrono dentro de effect
      setTimeout(() => {
        setIsInitialLoad(true);
      }, 0);
    }
  }, [pathname, user?.id]);

  // Recarrega recibos quando a página volta a ficar visível (navegação de volta)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user?.id && pathname === '/') {
        loadReceipts(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, pathname, loadReceipts]);

  // Calcula estatísticas
  const stats = useMemo(() => {
    const openReceipts = receipts.filter((r: Receipt) => !r.isClosed);
    const closedReceipts = receipts.filter((r: Receipt) => r.isClosed);
    const totalSpent = receipts.reduce((sum: number, r: Receipt) => sum + (r.total || 0), 0);
    const averageReceipt = receipts.length > 0 ? totalSpent / receipts.length : 0;

    return {
      totalSpent,
      activeReceipts: openReceipts.length,
      closedReceipts: closedReceipts.length,
      averageReceipt,
    };
  }, [receipts]);



  // Mostra loading completo enquanto estiver carregando na primeira vez
  if (loading && isInitialLoad) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-text-secondary">Carregando dados...</p>
        </div>
      </div>
    );
  }

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
          <div className="bg-surface-alt text-white px-4 py-2 rounded-b-lg shadow-lg flex items-center gap-2">
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
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-text-primary">
              Dashboard
            </h1>
            <button
              onClick={() => setShowSearch(true)}
              className="p-3 rounded-lg border border-border text-text-primary hover:bg-secondary-hover transition-colors"
              aria-label="Buscar recibo"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          </div>
          <p className="text-text-secondary">
            Visão geral dos seus recibos
          </p>
        </div>

        {/* Alerta de Recibos Abertos */}
        <OpenReceiptsAlert receipts={receipts} />

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatCard
            title="Total Gasto"
            value={formatCurrency(stats.totalSpent)}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Recibos Ativos"
            value={stats.activeReceipts}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
          <StatCard
            title="Recibos Fechados"
            value={stats.closedReceipts}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Média por Recibo"
            value={formatCurrency(stats.averageReceipt)}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
        </div>

        {/* Gráficos (Placeholders) */}
        <div className="space-y-4 mb-6">
          <ChartCard title="Gastos por Período">
            <div className="text-center text-text-muted">
              <svg className="w-16 h-16 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm">Gráfico será implementado em breve</p>
            </div>
          </ChartCard>

          <ChartCard title="Distribuição de Gastos">
            <div className="text-center text-text-muted">
              <svg className="w-16 h-16 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
              <p className="text-sm">Gráfico será implementado em breve</p>
            </div>
          </ChartCard>
        </div>

        {receipts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-secondary mb-4">
              Nenhum recibo encontrado
            </p>
            <button
              onClick={() => router.push('/receipt/new')}
              className="px-4 py-2 rounded-lg bg-primary text-text-inverse font-medium hover:bg-primary-hover transition-colors"
            >
              Criar Primeiro Recibo
            </button>
          </div>
        )}
      </div>

      {showSearch && (
        <DynamicSearchReceipt
          onClose={() => setShowSearch(false)}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
        />
      )}
    </div>
  );
}
