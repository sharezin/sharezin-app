'use client';

import { useState, useEffect, useCallback } from 'react';
import { Receipt } from '@/types';
import { getReceipts, saveReceipt, deleteReceipt, getReceipt } from '@/lib/storage';
import { calculateReceiptTotal } from '@/lib/calculations';
import { generateInviteCode } from '@/lib/utils';

export function useReceipts() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = useCallback(() => {
    try {
      const loadedReceipts = getReceipts();
      setReceipts(loadedReceipts);
    } catch (error) {
      console.error('Erro ao carregar recibos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createReceipt = useCallback((
    title: string,
    serviceChargePercent: number = 0,
    cover: number = 0
  ): Receipt => {
    const newReceipt: Receipt = {
      id: crypto.randomUUID(),
      title,
      date: new Date().toISOString(),
      creatorId: 'default-user', // ID do criador (será substituído por conta logada futuramente)
      inviteCode: generateInviteCode(),
      participants: [],
      pendingParticipants: [],
      items: [],
      deletionRequests: [],
      serviceChargePercent,
      cover,
      total: 0,
      isClosed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    saveReceipt(newReceipt);
    loadReceipts();
    return newReceipt;
  }, [loadReceipts]);

  const updateReceipt = useCallback((receipt: Receipt) => {
    // Recalcula o total
    const total = calculateReceiptTotal(receipt);
    const updatedReceipt = {
      ...receipt,
      total,
      updatedAt: new Date().toISOString(),
    };
    
    saveReceipt(updatedReceipt);
    loadReceipts();
    return updatedReceipt;
  }, [loadReceipts]);

  const removeReceipt = useCallback((id: string) => {
    deleteReceipt(id);
    loadReceipts();
  }, [loadReceipts]);

  const getReceiptById = useCallback((id: string): Receipt | null => {
    return getReceipt(id);
  }, []);

  return {
    receipts,
    loading,
    createReceipt,
    updateReceipt,
    removeReceipt,
    getReceiptById,
    refreshReceipts: loadReceipts,
  };
}

