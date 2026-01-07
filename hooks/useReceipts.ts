'use client';

import { useState, useEffect, useCallback } from 'react';
import { Receipt } from '@/types';
import { apiRequest } from '@/lib/api';
import { calculateReceiptTotal } from '@/lib/calculations';
import { transformReceiptFromApi, ApiReceipt } from '@/lib/transformers/receiptTransformer';

export function useReceipts() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Removido carregamento automático - deve ser chamado explicitamente pelos componentes

  const createReceipt = useCallback(async (
    title: string,
    serviceChargePercent: number = 0,
    cover: number = 0,
    groupId?: string
  ): Promise<Receipt> => {
    setError(null);
    try {
      const response = await apiRequest<{ receipt: ApiReceipt }>('/api/receipts', {
        method: 'POST',
        body: JSON.stringify({
          title,
          serviceChargePercent,
          cover,
          groupId,
        }),
      });
      
      const receipt = transformReceiptFromApi(response.receipt);
      await loadReceipts();
      return receipt;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar recibo';
      setError(errorMessage);
      throw err;
    }
  }, [loadReceipts]);

  const updateReceipt = useCallback(async (receipt: Receipt): Promise<Receipt> => {
    setError(null);
    try {
      // Recalcula o total antes de enviar
      const total = calculateReceiptTotal(receipt);
      const receiptToUpdate = {
        ...receipt,
        total,
        updatedAt: new Date().toISOString(),
      };

      const response = await apiRequest<{ receipt: ApiReceipt }>(`/api/receipts/${receipt.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: receiptToUpdate.title,
          serviceChargePercent: receiptToUpdate.serviceChargePercent,
          cover: receiptToUpdate.cover,
          isClosed: receiptToUpdate.isClosed,
          total,
          participants: receiptToUpdate.participants,
          items: receiptToUpdate.items,
          pendingParticipants: receiptToUpdate.pendingParticipants, // Incluir pendingParticipants
          deletionRequests: receiptToUpdate.deletionRequests, // Incluir deletionRequests
        }),
      });

      const updatedReceipt = transformReceiptFromApi(response.receipt);
      await loadReceipts();
      return updatedReceipt;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar recibo';
      setError(errorMessage);
      throw err;
    }
  }, [loadReceipts]);

  const removeReceipt = useCallback(async (id: string) => {
    setError(null);
    try {
      await apiRequest(`/api/receipts/${id}`, {
        method: 'DELETE',
      });
      await loadReceipts();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir recibo';
      setError(errorMessage);
      throw err;
    }
  }, [loadReceipts]);

  const getReceiptById = useCallback(async (id: string): Promise<Receipt | null> => {
    setError(null);
    try {
      const response = await apiRequest<{ receipt: ApiReceipt }>(`/api/receipts/${id}`);
      return transformReceiptFromApi(response.receipt);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar recibo';
      setError(errorMessage);
      return null;
    }
  }, []);

  // Função para carregar apenas recibos abertos (home)
  const loadOpenReceipts = useCallback(() => {
    return loadReceipts(false);
  }, [loadReceipts]);

  // Função para carregar apenas recibos fechados (histórico)
  const loadClosedReceipts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<{ receipts: ApiReceipt[]; total: number }>(
        `/api/receipts?onlyClosed=true`
      );
      const transformedReceipts = response.receipts.map(transformReceiptFromApi);
      setReceipts(transformedReceipts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar recibos fechados';
      setError(errorMessage);
      if (errorMessage.includes('401') || errorMessage.includes('Não autenticado')) {
        setReceipts([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const removeParticipant = useCallback(async (receiptId: string, participantId: string): Promise<Receipt> => {
    setError(null);
    try {
      const response = await apiRequest<{ receipt: ApiReceipt }>(
        `/api/receipts/${receiptId}/participants/${participantId}`,
        {
          method: 'DELETE',
        }
      );

      const updatedReceipt = transformReceiptFromApi(response.receipt);
      await loadReceipts();
      return updatedReceipt;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao remover participante';
      setError(errorMessage);
      throw err;
    }
  }, [loadReceipts]);

  const closeParticipantParticipation = useCallback(async (receiptId: string, participantId: string): Promise<Receipt> => {
    setError(null);
    try {
      const response = await apiRequest<{ receipt: ApiReceipt }>(
        `/api/receipts/${receiptId}/participants/${participantId}/close`,
        {
          method: 'POST',
        }
      );

      const updatedReceipt = transformReceiptFromApi(response.receipt);
      await loadReceipts();
      return updatedReceipt;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fechar participação';
      setError(errorMessage);
      throw err;
    }
  }, [loadReceipts]);

  return {
    receipts,
    loading,
    error,
    createReceipt,
    updateReceipt,
    removeReceipt,
    getReceiptById,
    refreshReceipts: loadReceipts,
    loadOpenReceipts,
    loadClosedReceipts,
    removeParticipant,
    closeParticipantParticipation,
  };
}

