'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiRequest } from '@/lib/api';
import { UserPlan, Plan } from '@/types';

interface UserPlanContextType {
  plan: UserPlan | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  canAddParticipant: (currentCount: number) => boolean;
  canCreateReceipt: (receiptsThisMonth: number) => boolean;
  canViewHistory: (historyCount: number) => boolean;
  hasFeature: (feature: keyof UserPlan['features']) => boolean;
}

const UserPlanContext = createContext<UserPlanContextType | undefined>(undefined);

interface UserPlanProviderProps {
  children: ReactNode;
}

export function UserPlanProvider({ children }: UserPlanProviderProps) {
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlan = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiRequest<{ plan: Plan; subscription?: any; expiresAt?: string | null }>('/api/subscriptions');
      
      // A API retorna { plan, subscription, expiresAt }
      const planData = response.plan;
      // Se houver subscription, há assinatura ativa
      const hasActiveSubscription = response.subscription !== null && response.subscription !== undefined;
      
      const userPlan: UserPlan = {
        planId: planData.id,
        planName: planData.name,
        planDisplayName: planData.displayName,
        maxParticipants: planData.maxParticipantsPerReceipt,
        maxReceiptsPerMonth: planData.maxReceiptsPerMonth,
        maxHistoryReceipts: planData.maxHistoryReceipts,
        features: planData.features,
        // Se houver subscription ativa, usar expiresAt da resposta (ou do subscription)
        expiresAt: hasActiveSubscription 
          ? (response.expiresAt || response.subscription?.expiresAt || null) 
          : null,
      };
      
      setPlan(userPlan);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar plano';
      setError(errorMessage);
      // Em caso de erro, definir plano gratuito como padrão
      setPlan({
        planId: '',
        planName: 'free',
        planDisplayName: 'Gratuito',
        maxParticipants: 5,
        maxReceiptsPerMonth: 3,
        maxHistoryReceipts: 10,
        features: {},
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const canAddParticipant = useCallback((currentCount: number): boolean => {
    if (!plan) return false;
    // Se maxParticipants é null, significa ilimitado
    if (plan.maxParticipants === null) return true;
    return currentCount < plan.maxParticipants;
  }, [plan]);

  const canCreateReceipt = useCallback((receiptsThisMonth: number): boolean => {
    if (!plan) return false;
    // Se maxReceiptsPerMonth é null, significa ilimitado
    if (plan.maxReceiptsPerMonth === null) return true;
    return receiptsThisMonth < plan.maxReceiptsPerMonth;
  }, [plan]);

  const canViewHistory = useCallback((historyCount: number): boolean => {
    if (!plan) return false;
    // Se maxHistoryReceipts é null, significa ilimitado
    if (plan.maxHistoryReceipts === null) return true;
    return historyCount <= plan.maxHistoryReceipts;
  }, [plan]);

  const hasFeature = useCallback((feature: keyof UserPlan['features']): boolean => {
    if (!plan) return false;
    return plan.features[feature] === true;
  }, [plan]);

  return (
    <UserPlanContext.Provider
      value={{
        plan,
        loading,
        error,
        refresh: loadPlan,
        canAddParticipant,
        canCreateReceipt,
        canViewHistory,
        hasFeature,
      }}
    >
      {children}
    </UserPlanContext.Provider>
  );
}

export function useUserPlan(): UserPlanContextType {
  const context = useContext(UserPlanContext);
  if (context === undefined) {
    throw new Error('useUserPlan must be used within a UserPlanProvider');
  }
  return context;
}
