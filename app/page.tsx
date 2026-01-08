'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useReceipts } from '@/hooks/useReceipts';
import { useAuth } from '@/hooks/useAuth';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { ReceiptCard } from '@/components/ui/ReceiptCard';
import { EmptyState } from '@/components/ui/EmptyState';
import dynamic from 'next/dynamic';

const DynamicSearchReceipt = dynamic(() => import('@/components/SearchReceipt').then(mod => ({ default: mod.SearchReceipt })), {
  loading: () => null,
  ssr: false,
});

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const { receipts, loading, loadOpenReceipts } = useReceipts();
  const { user } = useAuth();
  const [showSearch, setShowSearch] = useState(false);
  const hasLoadedRef = useRef(false);
  
  // ID e nome do usuário atual
  const currentUserId = user?.id || '';
  const currentUserName = user?.name || 'Usuário';

  // Pull-to-refresh para atualizar recibos
  const { isRefreshing, pullDistance, pullProgress } = usePullToRefresh({
    onRefresh: async () => {
      if (user?.id) {
        await loadOpenReceipts();
      }
    },
    enabled: !!user?.id && !loading,
  });

  // Carrega recibos apenas uma vez quando o usuário estiver disponível e estiver na página home
  useEffect(() => {
    if (user?.id && pathname === '/' && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadOpenReceipts();
    }
  }, [user?.id, pathname, loadOpenReceipts]);

  // Reset flag quando mudar de página ou usuário
  useEffect(() => {
    if (pathname !== '/' || !user?.id) {
      hasLoadedRef.current = false;
    }
  }, [pathname, user?.id]);

  // Recarrega recibos quando a página volta a ficar visível (navegação de volta)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user?.id && pathname === '/') {
        // Permite recarregar quando volta a ficar visível (navegação de volta)
        loadOpenReceipts();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, pathname, loadOpenReceipts]);

  // Home mostra apenas recibos abertos (a API já retorna apenas abertos)
  // A API já retorna apenas recibos do usuário autenticado (criador ou participante)
  const filteredReceipts = receipts;

  const handleCreateReceipt = () => {
    router.push('/receipt/new');
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-text-secondary">Carregando...</p>
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
              Sharezin
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
            Gerencie recibos compartilhados
          </p>
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
            title="Nenhum recibo cadastrado ou participando"
            description="Crie um novo recibo ou busque um recibo existente usando o código de convite"
          />
        ) : (
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


      {showSearch && (
        <DynamicSearchReceipt
          onClose={() => setShowSearch(false)}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
        />
      )}

      {/* Floating Action Button */}
      <button
        onClick={handleCreateReceipt}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-primary text-text-inverse font-medium hover:bg-primary-hover transition-colors shadow-lg hover:shadow-xl flex items-center justify-center z-[60]"
        aria-label="Criar novo recibo"
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
