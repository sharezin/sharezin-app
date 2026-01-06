'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useReceipts } from '@/hooks/useReceipts';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/calculations';
import { SearchReceipt } from '@/components/SearchReceipt';

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
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-black dark:text-zinc-50">
              Sharezin
            </h1>
            <button
              onClick={() => setShowSearch(true)}
              className="p-3 rounded-lg border border-zinc-300 dark:border-zinc-600 text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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
          <p className="text-zinc-600 dark:text-zinc-400">
            Gerencie recibos compartilhados
          </p>
        </div>

        {filteredReceipts.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4">
              <svg
                className="mx-auto h-16 w-16 text-zinc-400 dark:text-zinc-600"
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
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 text-lg">
              Nenhum recibo cadastrado ou participando
            </p>
            <p className="text-zinc-500 dark:text-zinc-500 text-sm mt-2">
              Crie um novo recibo ou busque um recibo existente usando o código de convite
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReceipts
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map(receipt => (
                <div
                  key={receipt.id}
                  className="relative"
                >
                  <a
                    href={`/receipt/${receipt.id}`}
                    className="block p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-black dark:text-zinc-50 mb-1">
                          {receipt.title}
                        </h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                          {new Date(receipt.date).toLocaleDateString('pt-BR')}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-zinc-600 dark:text-zinc-400">
                            {receipt.participants.length} participante{receipt.participants.length !== 1 ? 's' : ''}
                          </span>
                          <span className="text-zinc-600 dark:text-zinc-400">
                            {receipt.items.length} item{receipt.items.length !== 1 ? 's' : ''}
                          </span>
                          <span className="font-semibold text-black dark:text-zinc-50">
                            {formatCurrency(receipt.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </a>
                </div>
              ))}
          </div>
        )}
      </div>


      {showSearch && (
        <SearchReceipt
          onClose={() => setShowSearch(false)}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
        />
      )}

      {/* Floating Action Button */}
      <button
        onClick={handleCreateReceipt}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-black dark:bg-white text-white dark:text-black font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-lg hover:shadow-xl flex items-center justify-center z-[60]"
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
