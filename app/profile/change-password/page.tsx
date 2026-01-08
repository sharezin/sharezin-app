'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AlertModal } from '@/components/Modal';
import { apiRequest } from '@/lib/api';

export default function ChangePasswordPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const validatePasswordForm = (): boolean => {
    const errors: typeof passwordErrors = {};

    if (!currentPassword.trim()) {
      errors.currentPassword = 'Senha atual é obrigatória';
    }

    if (!newPassword.trim()) {
      errors.newPassword = 'Nova senha é obrigatória';
    } else if (newPassword.length < 6) {
      errors.newPassword = 'Nova senha deve ter pelo menos 6 caracteres';
    }

    if (!confirmPassword.trim()) {
      errors.confirmPassword = 'Confirmação de senha é obrigatória';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'As senhas não coincidem';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) {
      return;
    }

    setIsChangingPassword(true);
    setPasswordErrors({});

    try {
      await apiRequest<{ success: boolean; message: string }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      // Limpar campos após sucesso
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowSuccessModal(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao alterar senha. Tente novamente.';
      
      // Tratar erros específicos
      if (errorMessage.includes('Senha atual incorreta')) {
        setPasswordErrors({ currentPassword: 'Senha atual incorreta' });
      } else if (errorMessage.includes('deve ter pelo menos 6 caracteres')) {
        setPasswordErrors({ newPassword: 'Nova senha deve ter pelo menos 6 caracteres' });
      } else if (errorMessage.includes('diferente da senha atual')) {
        setPasswordErrors({ newPassword: 'A nova senha deve ser diferente da senha atual' });
      } else {
        setPasswordErrors({ newPassword: errorMessage });
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    router.push('/profile');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-text-secondary">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.push('/profile')}
              className="p-2 rounded-lg border border-border text-text-primary hover:bg-secondary-hover transition-colors"
              aria-label="Voltar"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-text-primary">
              Trocar Senha
            </h1>
          </div>
          <p className="text-text-secondary">
            Altere sua senha de acesso
          </p>
        </div>

        <div className="bg-surface rounded-lg p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Senha Atual
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (passwordErrors.currentPassword) {
                    setPasswordErrors({ ...passwordErrors, currentPassword: undefined });
                  }
                }}
                placeholder="Digite sua senha atual"
                className="w-full px-4 py-3 rounded-lg border border-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isChangingPassword}
              />
              {passwordErrors.currentPassword && (
                <p className="text-sm text-error mt-1">
                  {passwordErrors.currentPassword}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Nova Senha
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (passwordErrors.newPassword) {
                    setPasswordErrors({ ...passwordErrors, newPassword: undefined });
                  }
                  // Limpar erro de confirmação se as senhas coincidirem
                  if (e.target.value === confirmPassword && passwordErrors.confirmPassword) {
                    setPasswordErrors({ ...passwordErrors, confirmPassword: undefined });
                  }
                }}
                placeholder="Digite sua nova senha (mín. 6 caracteres)"
                className="w-full px-4 py-3 rounded-lg border border-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isChangingPassword}
              />
              {passwordErrors.newPassword && (
                <p className="text-sm text-error mt-1">
                  {passwordErrors.newPassword}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (passwordErrors.confirmPassword) {
                    setPasswordErrors({ ...passwordErrors, confirmPassword: undefined });
                  }
                }}
                placeholder="Digite novamente sua nova senha"
                className="w-full px-4 py-3 rounded-lg border border-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isChangingPassword}
              />
              {passwordErrors.confirmPassword && (
                <p className="text-sm text-error mt-1">
                  {passwordErrors.confirmPassword}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => router.push('/profile')}
                disabled={isChangingPassword}
                className="flex-1 px-4 py-3 rounded-lg border border-border text-text-primary hover:bg-secondary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                className="flex-1 px-4 py-3 rounded-lg bg-primary text-text-inverse font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isChangingPassword ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Alterando...
                  </>
                ) : (
                  'Alterar Senha'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AlertModal
        isOpen={showSuccessModal}
        onClose={handleSuccessClose}
        title="Senha Alterada"
        message="Sua senha foi alterada com sucesso!"
        buttonText="OK"
        variant="success"
      />
    </div>
  );
}
