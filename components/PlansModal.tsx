'use client';

import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './ui/Button';
import { apiRequest } from '@/lib/api';
import { Plan } from '@/types';
import { useUserPlan } from '@/hooks/useUserPlan';
import { Check, X } from 'lucide-react';

interface PlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
}

export function PlansModal({ isOpen, onClose, onUpgrade }: PlansModalProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const { plan, refresh } = useUserPlan();

  useEffect(() => {
    if (isOpen) {
      loadPlans();
    } else {
      // Resetar estado quando fechar o modal
      setPlans([]);
      setLoading(true);
    }
  }, [isOpen]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = await apiRequest<{ plans: Plan[] }>('/api/plans');
      
      if (response && response.plans && Array.isArray(response.plans)) {
        setPlans(response.plans);
      } else {
        // Se a resposta não tiver a estrutura esperada
        setPlans([]);
      }
    } catch (error) {
      // Erro ao carregar planos - manter planos vazios
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    try {
      setUpgrading(planId);
      await apiRequest('/api/subscriptions', {
        method: 'POST',
        body: JSON.stringify({ planId }),
      });
      await refresh();
      if (onUpgrade) {
        onUpgrade();
      }
      onClose();
    } catch (error: any) {
      alert(error.message || 'Erro ao fazer upgrade. Tente novamente.');
    } finally {
      setUpgrading(null);
    }
  };

  const isCurrentPlan = (planName: string) => {
    return plan?.planName === planName;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Planos e Preços">
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-text-secondary">Nenhum plano disponível no momento.</p>
          </div>
        ) : (
          plans.map((p) => (
            <div
              key={p.id}
              className={`border rounded-lg p-6 ${
                isCurrentPlan(p.name)
                  ? 'border-primary bg-primary/5'
                  : 'border-border-strong'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-text-primary">
                    {p.displayName}
                  </h3>
                  <p className="text-text-secondary text-sm mt-1">
                    {p.description}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-text-primary">
                    {p.priceMonthly === 0 ? (
                      'Grátis'
                    ) : (
                      <>
                        R$ {p.priceMonthly.toFixed(2)}
                        <span className="text-sm font-normal text-text-secondary">
                          /mês
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                {p.maxParticipantsPerReceipt !== null && (
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span className="text-text-primary">
                      Até {p.maxParticipantsPerReceipt} participantes por recibo
                    </span>
                  </div>
                )}
                {p.maxReceiptsPerMonth !== null && (
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span className="text-text-primary">
                      Até {p.maxReceiptsPerMonth} recibos por mês
                    </span>
                  </div>
                )}
                {p.features.dashboard && (
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span className="text-text-primary">
                      Dashboard e Analytics
                    </span>
                  </div>
                )}
                {p.features.pdfExport && (
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span className="text-text-primary">
                      Exportação em PDF
                    </span>
                  </div>
                )}
                {p.features.excelExport && (
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span className="text-text-primary">
                      Exportação em Excel/CSV
                    </span>
                  </div>
                )}
              </div>

              {isCurrentPlan(p.name) ? (
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled
                >
                  Plano Atual
                </Button>
              ) : (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => handleUpgrade(p.id)}
                  loading={upgrading === p.id}
                >
                  {p.priceMonthly === 0 ? 'Voltar para Gratuito' : 'Fazer Upgrade'}
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
