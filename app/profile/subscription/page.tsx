'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useUserPlan } from '@/hooks/useUserPlan';
import { apiRequest } from '@/lib/api';
import { ConfirmModal, AlertModal } from '@/components/Modal';
import { Button } from '@/components/ui/Button';
import { BackButton } from '@/components/ui/BackButton';

export default function SubscriptionPage() {
  const { user, loading: authLoading } = useAuth();
  const { plan, loading: planLoading, refresh } = useUserPlan();
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: 'success' | 'error' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const handleCancelSubscription = async () => {
    try {
      setCancelling(true);
      
      await apiRequest('/api/subscriptions/cancel', {
        method: 'POST',
      });

      await refresh();
      
      setAlertModal({
        isOpen: true,
        title: 'Assinatura Cancelada',
        message: 'Sua assinatura foi cancelada com sucesso. Você continuará tendo acesso ao plano Premium até a data de expiração.',
        variant: 'success',
      });
      
      setShowCancelConfirm(false);
    } catch (error: any) {
      setAlertModal({
        isOpen: true,
        title: 'Erro',
        message: error?.message || 'Erro ao cancelar assinatura. Tente novamente.',
        variant: 'error',
      });
    } finally {
      setCancelling(false);
    }
  };

  if (authLoading || planLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center pb-20">
        <p className="text-text-secondary">Carregando...</p>
      </div>
    );
  }

  const isPremium = plan?.planName === 'premium';
  const hasActiveSubscription = plan?.expiresAt !== null && plan?.expiresAt !== undefined;

  if (!isPremium || !hasActiveSubscription) {
    return (
      <div className="min-h-screen bg-bg pb-20">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <BackButton />
          <div className="bg-surface rounded-lg p-6 mt-6 text-center">
            <p className="text-text-secondary mb-4">
              Você não possui uma assinatura Premium ativa.
            </p>
            <Button
              onClick={() => router.push('/profile')}
              variant="primary"
            >
              Voltar ao Perfil
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const expiryDate = plan.expiresAt ? new Date(plan.expiresAt) : null;
  const daysUntilExpiry = expiryDate
    ? Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <BackButton />
        
        <div className="mb-6 mt-6">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Gerenciar Assinatura
          </h1>
          <p className="text-text-secondary">
            Gerencie sua assinatura Premium
          </p>
        </div>

        <div className="bg-surface rounded-lg p-6 space-y-6">
          {/* Informações da Assinatura */}
          <div className="bg-primary/10 rounded-lg p-4 border border-primary/30">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Plano Atual: {plan.planDisplayName}
            </h2>
            
            <div className="space-y-2 text-sm">
              {expiryDate && (
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Data de Expiração:</span>
                  <span className="text-text-primary font-medium">
                    {expiryDate.toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
              
              {daysUntilExpiry !== null && daysUntilExpiry > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Dias Restantes:</span>
                  <span className="text-text-primary font-medium">
                    {daysUntilExpiry} {daysUntilExpiry === 1 ? 'dia' : 'dias'}
                  </span>
                </div>
              )}
              
              {daysUntilExpiry !== null && daysUntilExpiry <= 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-error">Status:</span>
                  <span className="text-error font-medium">Expirada</span>
                </div>
              )}
            </div>
          </div>

          {/* Benefícios do Plano */}
          <div>
            <h3 className="text-md font-semibold text-text-primary mb-3">
              Benefícios do Plano Premium
            </h3>
            <div className="space-y-2 text-sm text-text-secondary">
              <p>• Participantes ilimitados por recibo</p>
              <p>• Recibos ilimitados por mês</p>
              <p>• Histórico completo</p>
              <p>• Dashboard e Analytics</p>
              <p>• Exportação em PDF</p>
              <p>• Exportação em Excel/CSV</p>
            </div>
          </div>

          {/* Aviso sobre Cancelamento */}
          <div className="bg-warning/10 rounded-lg p-4 border border-warning/30">
            <p className="text-sm text-text-primary">
              <strong>⚠️ Atenção:</strong> Ao cancelar sua assinatura, você continuará tendo acesso ao plano Premium até a data de expiração ({expiryDate?.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}). Após essa data, sua conta será automaticamente convertida para o plano Gratuito.
            </p>
          </div>

          {/* Botão de Cancelamento */}
          <div className="pt-4 border-t border-border-strong">
            <Button
              onClick={() => setShowCancelConfirm(true)}
              variant="danger"
              className="w-full"
            >
              Cancelar Assinatura
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Cancelamento */}
      <ConfirmModal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancelSubscription}
        title="Cancelar Assinatura"
        message={`Tem certeza que deseja cancelar sua assinatura Premium? Você continuará tendo acesso até ${expiryDate?.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.`}
        confirmText="Sim, Cancelar"
        cancelText="Não, Manter"
        confirmVariant="danger"
        loading={cancelling}
      />

      {/* Modal de Alerta */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => {
          setAlertModal({ ...alertModal, isOpen: false });
          if (alertModal.variant === 'success') {
            router.push('/profile');
          }
        }}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
      />
    </div>
  );
}
