'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useUserPlan } from '@/hooks/useUserPlan';
import { ConfirmModal } from '@/components/Modal';
import { Button } from '@/components/ui/Button';
import { BackButton } from '@/components/ui/BackButton';
import { apiRequest } from '@/lib/api';

export default function CancelSubscriptionPage() {
  const { user, loading: authLoading } = useAuth();
  const { plan, refresh } = useUserPlan();
  const router = useRouter();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Se não estiver autenticado ou não tiver plano premium, redirecionar
    if (!authLoading && (!user || plan?.planName !== 'premium')) {
      router.push('/profile');
    }
  }, [user, plan, authLoading, router]);

  const handleCancel = async () => {
    try {
      setCancelling(true);
      setError(null);

      await apiRequest('/api/subscriptions', {
        method: 'PUT',
        body: JSON.stringify({ action: 'cancel' }),
      });

      // Atualizar o plano no contexto
      await refresh();

      // Redirecionar para perfil após cancelamento
      router.push('/profile');
    } catch (err: any) {
      setError(err?.message || 'Erro ao cancelar assinatura. Tente novamente.');
      setCancelling(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-text-secondary">Carregando...</p>
      </div>
    );
  }

  if (!user || plan?.planName !== 'premium') {
    return null; // Será redirecionado pelo useEffect
  }

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <BackButton onClick={() => router.push('/profile')} />

        <div className="mb-6 mt-4">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Cancelar Assinatura
          </h1>
          <p className="text-text-secondary">
            Gerencie sua assinatura Premium
          </p>
        </div>

        <div className="bg-surface rounded-lg p-6 space-y-6">
          {/* Informações da assinatura */}
          <div className="bg-primary/10 rounded-lg p-4 border border-primary/30">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Sua Assinatura Premium
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Plano:</span>
                <span className="text-text-primary font-medium">
                  {plan?.planDisplayName}
                </span>
              </div>
              {plan?.expiresAt && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Próxima cobrança:</span>
                  <span className="text-text-primary font-medium">
                    {new Date(plan.expiresAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Aviso sobre cancelamento */}
          <div className="bg-warning/10 rounded-lg p-4 border border-warning/30">
            <h3 className="text-md font-semibold text-text-primary mb-2">
              ⚠️ O que acontece ao cancelar?
            </h3>
            <ul className="text-sm text-text-secondary space-y-2 list-disc list-inside">
              <li>Sua assinatura será cancelada e não será renovada automaticamente</li>
              <li>Você continuará com acesso Premium até a data de expiração</li>
              <li>Após a expiração, você voltará automaticamente para o plano Gratuito</li>
              <li>Você pode reativar sua assinatura a qualquer momento</li>
            </ul>
          </div>

          {/* Erro */}
          {error && (
            <div className="bg-error/10 rounded-lg p-4 border border-error/30">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {/* Botão de cancelar */}
          <Button
            variant="danger"
            className="w-full"
            onClick={() => setShowConfirmModal(true)}
            disabled={cancelling}
          >
            Cancelar Assinatura
          </Button>

          {/* Botão voltar */}
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => router.push('/profile')}
            disabled={cancelling}
          >
            Voltar para Perfil
          </Button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleCancel}
        title="Cancelar Assinatura"
        message="Tem certeza que deseja cancelar sua assinatura Premium? Você continuará com acesso até a data de expiração."
        confirmText="Sim, cancelar"
        cancelText="Não, manter assinatura"
        confirmVariant="danger"
      />
    </div>
  );
}
