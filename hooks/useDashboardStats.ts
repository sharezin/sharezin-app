'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuth } from './useAuth';

export interface ExpenseByPeriod {
  period: string; // YYYY-MM
  total: number;
  receiptCount: number;
}

export interface ExpenseByDay {
  day: string; // YYYY-MM-DD
  total: number;
  receiptCount: number;
}

export interface ExpenseDistribution {
  receiptId: string;
  receiptTitle: string;
  receiptDate: string;
  totalSpent: number;
  isClosed: boolean;
}

export interface DashboardStats {
  expensesByPeriod: ExpenseByPeriod[];
  expensesByDay?: ExpenseByDay[];
  expenseDistribution: ExpenseDistribution[];
}

export function useDashboardStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (year?: string) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const yearParam = year || new Date().getFullYear().toString();
      const url = `/api/receipts/dashboard-stats${yearParam ? `?year=${yearParam}` : ''}`;
      const data = await apiRequest<DashboardStats>(url);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar estatísticas');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}
