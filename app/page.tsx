'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useReceiptsContext } from '@/contexts/ReceiptsContext';
import { useAuth } from '@/hooks/useAuth';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { StatCard } from '@/components/ui/StatCard';
import { ChartCard } from '@/components/ui/ChartCard';
import { OpenReceiptsAlert } from '@/components/ui/OpenReceiptsAlert';
import { ExpensesByPeriodChart } from '@/components/dashboard/ExpensesByPeriodChart';
import { ExpenseDistributionRadialChart } from '@/components/dashboard/ExpenseDistributionRadialChart';
import { formatCurrency } from '@/lib/calculations';
import { Receipt } from '@/types';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { NotificationIcon } from '@/components/ui/NotificationIcon';
import dynamic from 'next/dynamic';

const DynamicCreateOrJoinReceiptModal = dynamic(() => import('@/components/CreateOrJoinReceiptModal').then(mod => ({ default: mod.CreateOrJoinReceiptModal })), {
  loading: () => null,
  ssr: false,
});

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const { receipts, loading, loadReceipts } = useReceiptsContext();
  const { user } = useAuth();
  const { stats: dashboardStats, loading: statsLoading, refetch: refetchStats } = useDashboardStats();
  const [showCreateOrJoinModal, setShowCreateOrJoinModal] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const hasLoadedRef = useRef(false);
  
  // ID e nome do usuário atual
  const currentUserId = user?.id || '';
  const currentUserName = user?.name || 'Usuário';

  // Pull-to-refresh para atualizar recibos
  const { isRefreshing, pullDistance, pullProgress } = usePullToRefresh({
    onRefresh: async () => {
      if (user?.id) {
        await Promise.all([
          loadReceipts(true), // Carrega todos os recibos incluindo fechados
          refetchStats(), // Atualiza estatísticas do dashboard
        ]);
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
      // Usa queueMicrotask para garantir que a atualização aconteça após o render
      queueMicrotask(() => {
        loadReceipts(true).then(() => {
          setIsInitialLoad(false);
        });
      });
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
    const totalSpent = receipts.reduce((sum: number, r: Receipt) => sum + (r.total || 0), 0);
    const averageReceipt = receipts.length > 0 ? totalSpent / receipts.length : 0;

    return {
      totalSpent,
      totalReceipts: receipts.length,
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
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-text-primary mb-2">
                Dashboard
              </h1>
              <p className="text-text-secondary">
                Visão geral dos seus recibos
              </p>
            </div>
            <NotificationIcon />
          </div>
        </div>

        {/* Alerta de Recibos Abertos */}
        <OpenReceiptsAlert receipts={receipts} />

        {/* Cards de Estatísticas */}
        <div className="space-y-4 mb-6">
          <StatCard
            title="Total Gasto"
            value={formatCurrency(stats.totalSpent)}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Recibos Totais"
              value={stats.totalReceipts}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
        </div>

        {/* Gráficos */}
        <div className="space-y-4 mb-6">
          <ChartCard title="Gastos por Período">
            {statsLoading ? (
              <div className="flex items-center justify-center h-[250px]">
                <div className="flex flex-col items-center gap-2">
                  <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-sm text-text-secondary">Carregando dados...</p>
                </div>
              </div>
            ) : dashboardStats?.expensesByPeriod ? (
              <ExpensesByPeriodChart data={dashboardStats.expensesByPeriod} />
            ) : (
              <div className="text-center text-text-muted py-8">
                <p className="text-sm">Nenhum dado disponível</p>
              </div>
            )}
          </ChartCard>

          <ChartCard title="Distribuição de Gastos">
            {statsLoading ? (
              <div className="flex items-center justify-center h-[250px]">
                <div className="flex flex-col items-center gap-2">
                  <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-sm text-text-secondary">Carregando dados...</p>
                </div>
              </div>
            ) : dashboardStats?.expenseDistribution ? (
              <ExpenseDistributionRadialChart data={dashboardStats.expenseDistribution} />
            ) : (
              <div className="text-center text-text-muted py-8">
                <p className="text-sm">Nenhum dado disponível</p>
              </div>
            )}
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

      {showCreateOrJoinModal && (
        <DynamicCreateOrJoinReceiptModal
          isOpen={showCreateOrJoinModal}
          onClose={() => setShowCreateOrJoinModal(false)}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
        />
      )}
    </div>
  );
}
