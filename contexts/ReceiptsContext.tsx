'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Receipt } from '@/types';
import { apiRequest } from '@/lib/api';
import { transformReceiptFromApi, ApiReceipt } from '@/lib/transformers/receiptTransformer';

interface ReceiptsContextType {
  receipts: Receipt[];
  loading: boolean;
  error: string | null;
  loadReceipts: (includeClosed?: boolean) => Promise<void>;
  refreshReceipts: () => Promise<void>;
}

const ReceiptsContext = createContext<ReceiptsContextType | undefined>(undefined);

export function ReceiptsProvider({ children }: { children: ReactNode }) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReceipts = useCallback(async (includeClosed: boolean = false) => {
    // Verifica se há token de autenticação antes de fazer a requisição
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) {
      setReceipts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Busca recibos com ou sem fechados dependendo do parâmetro
      const url = includeClosed 
        ? '/api/receipts?includeClosed=true'
        : '/api/receipts';
      const response = await apiRequest<{ receipts: ApiReceipt[] }>(url);
      const transformedReceipts = response.receipts.map(transformReceiptFromApi);
      setReceipts(transformedReceipts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar recibos';
      setError(errorMessage);
      // Em caso de erro de autenticação, limpa a lista
      if (errorMessage.includes('401') || errorMessage.includes('Não autenticado')) {
        setReceipts([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshReceipts = useCallback(async () => {
    await loadReceipts(true);
  }, [loadReceipts]);

  return (
    <ReceiptsContext.Provider
      value={{
        receipts,
        loading,
        error,
        loadReceipts,
        refreshReceipts,
      }}
    >
      {children}
    </ReceiptsContext.Provider>
  );
}

export function useReceiptsContext() {
  const context = useContext(ReceiptsContext);
  if (context === undefined) {
    throw new Error('useReceiptsContext must be used within a ReceiptsProvider');
  }
  return context;
}
