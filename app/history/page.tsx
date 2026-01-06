'use client';

import { useEffect, useRef } from 'react';
import { useReceipts } from '@/hooks/useReceipts';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/calculations';
import Link from 'next/link';

export default function HistoryPage() {
  const { receipts, loading, loadClosedReceipts } = useReceipts();
  const { user } = useAuth();
  const hasLoadedRef = useRef(false);

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
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center pb-20">
        <p className="text-zinc-600 dark:text-zinc-400">Carregando...</p>
      </div>
    );
  }

  // Filtra apenas recibos fechados
  const closedReceipts = receipts.filter(receipt => receipt.isClosed);

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
    <div className="min-h-screen bg-zinc-50 dark:bg-black pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black dark:text-zinc-50 mb-2">
            Histórico de Recibos
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Todos os recibos criados e participados
          </p>
        </div>

        {closedReceipts.length === 0 ? (
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 text-lg">
              Nenhum recibo no histórico
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map(date => (
              <div key={date}>
                <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3 uppercase">
                  {date}
                </h2>
                <div className="space-y-3">
                  {groupedByDate[date]
                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                    .map(receipt => (
                      <Link
                        key={receipt.id}
                        href={`/receipt/${receipt.id}`}
                        className="block p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-black dark:text-zinc-50 mb-1">
                              {receipt.title}
                            </h3>
                            <div className="flex items-center gap-4 text-sm mt-2">
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
                      </Link>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

