'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

// Cache global para armazenar dados por ano e usuário
const cache = new Map<string, { data: DashboardStats; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

function getCacheKey(userId: string, year: string): string {
  return `dashboard-stats-${userId}-${year}`;
}

function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_DURATION;
}

export function useDashboardStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentYearRef = useRef<string | null>(null);
  const loadingYearRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);

  const fetchStats = useCallback(async (year?: string, forceRefresh: boolean = false) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const yearParam = year || new Date().getFullYear().toString();
    const cacheKey = getCacheKey(user.id, yearParam);

    // Verificar cache antes de fazer requisição
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached && isCacheValid(cached.timestamp)) {
        setStats(cached.data);
        setLoading(false);
        setError(null);
        currentYearRef.current = yearParam;
        return;
      }
    }

    // Evitar múltiplas requisições simultâneas para o mesmo ano
    if (loadingYearRef.current === yearParam && !forceRefresh) {
      return;
    }

    try {
      loadingYearRef.current = yearParam;
      setLoading(true);
      setError(null);
      const url = `/api/receipts/dashboard-stats${yearParam ? `?year=${yearParam}` : ''}`;
      const data = await apiRequest<DashboardStats>(url);
      
      // Armazenar no cache
      cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });
      
      setStats(data);
      currentYearRef.current = yearParam;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar estatísticas');
      setStats(null);
    } finally {
      setLoading(false);
      loadingYearRef.current = null;
    }
  }, [user?.id]);

  // Função para invalidar cache
  const invalidateCache = useCallback((year?: string) => {
    if (user?.id) {
      const yearParam = year || currentYearRef.current || new Date().getFullYear().toString();
      const cacheKey = getCacheKey(user.id, yearParam);
      cache.delete(cacheKey);
    }
  }, [user?.id]);

  // Invalidar cache quando usuário mudar
  useEffect(() => {
    if (user?.id) {
      // Limpar cache do usuário anterior se houver mudança
      cache.clear();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      setStats(null);
      hasInitializedRef.current = false;
      return;
    }

    // Verificar cache primeiro antes de fazer requisição
    const yearParam = new Date().getFullYear().toString();
    const cacheKey = getCacheKey(user.id, yearParam);
    const cached = cache.get(cacheKey);
    
    if (cached && isCacheValid(cached.timestamp)) {
      // Usar dados do cache imediatamente
      setStats(cached.data);
      setLoading(false);
      setError(null);
      currentYearRef.current = yearParam;
      hasInitializedRef.current = true;
      return;
    }

    // Se não houver cache válido e ainda não inicializou, buscar dados
    if (!hasInitializedRef.current && !loadingYearRef.current) {
      hasInitializedRef.current = true;
      fetchStats();
    }
  }, [user?.id, fetchStats]);

  // Função para buscar dados de um ano específico (usando cache se disponível)
  const fetchYear = useCallback(async (year: string) => {
    await fetchStats(year, false);
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: (year?: string) => fetchStats(year, true), // forceRefresh = true
    fetchYear, // Buscar ano específico (com cache)
    invalidateCache,
  };
}
