'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { Receipt } from '@/types';
import { apiRequest } from '@/lib/api';
import { transformReceiptFromApi, ApiReceipt } from '@/lib/transformers/receiptTransformer';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface ReceiptsContextType {
  receipts: Receipt[];
  loading: boolean;
  error: string | null;
  loadReceipts: (includeClosed?: boolean) => Promise<void>;
  refreshReceipts: () => Promise<void>;
}

const ReceiptsContext = createContext<ReceiptsContextType | undefined>(undefined);

export function ReceiptsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs para gerenciar Realtime
  const channelRef = useRef<any>(null);

  const loadReceipts = useCallback(async (includeClosed: boolean = false) => {
    // Verifica se há token de autenticação antes de fazer a requisição
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) {
      // Usa setTimeout para garantir que a atualização aconteça após o render
      setTimeout(() => {
        setReceipts([]);
        setLoading(false);
      }, 0);
      return;
    }

    // Usa setTimeout para garantir que a atualização aconteça após o render
    setTimeout(() => {
      setLoading(true);
      setError(null);
    }, 0);

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

  // Configurar Realtime para recibos quando usuário estiver autenticado
  useEffect(() => {
    if (!user?.id) {
      setReceipts([]);
      return;
    }

    // Limpar conexão anterior
    if (channelRef.current) {
      supabase?.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Carregar recibos iniciais (com fechados para ter dados completos)
    loadReceipts(true);

    // Tentar conectar ao Realtime para recibos
    if (supabase) {
      try {
        const channel = supabase
          .channel(`receipts:${user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'receipts',
              filter: `creator_id=eq.${user.id}`,
            },
            async (payload: { eventType: string; new?: any; old?: any }) => {
              // Recarregar recibos quando houver mudanças
              await loadReceipts(true);
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'receipt_items',
            },
            async () => {
              // Recarregar recibos quando itens mudarem
              await loadReceipts(true);
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'receipt_participants',
            },
            async () => {
              // Recarregar recibos quando participantes mudarem
              await loadReceipts(true);
            }
          )
          .subscribe();

        channelRef.current = channel;
      } catch (err) {
        // Erro ao configurar Realtime - fallback será usado
      }
    }

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase?.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, loadReceipts]);

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
