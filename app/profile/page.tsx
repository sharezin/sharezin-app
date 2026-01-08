'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { ConfirmModal } from '@/components/Modal';
import { Button } from '@/components/ui/Button';

export default function ProfilePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  
  const isDarkMode = resolvedTheme === 'dark';
  
  const toggleTheme = () => {
    setTheme(isDarkMode ? 'light' : 'dark');
  };

  const handleLogout = () => {
    setLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    setLogoutConfirm(false);
  };

  const handleChangePassword = () => {
    router.push('/profile/change-password');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-text-secondary">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Perfil
          </h1>
          <p className="text-text-secondary">
            Informações da sua conta
          </p>
        </div>

        {user ? (
          <div className="bg-surface rounded-lg p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                {user.name}
              </h2>
              <p className="text-sm text-text-secondary">
                {user.email}
              </p>
              <p className="text-xs text-text-muted mt-1">
                ID: {user.id}
              </p>
            </div>

            <div className="pt-6 border-t border-border-strong space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    {isDarkMode ? (
                      <svg
                        className="w-5 h-5 text-text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 text-text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      Modo Escuro
                    </p>
                    <p className="text-xs text-text-secondary">
                      {isDarkMode ? 'Ativado' : 'Desativado'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    isDarkMode ? 'bg-primary' : 'bg-secondary'
                  }`}
                  role="switch"
                  aria-checked={isDarkMode}
                  aria-label="Alternar modo escuro"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                      isDarkMode 
                        ? 'translate-x-6 bg-text-inverse' 
                        : 'translate-x-1 bg-white'
                    }`}
                  />
                </button>
              </div>

              <Button
                onClick={handleChangePassword}
                variant="tertiary"
                className="w-full"
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
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
                Trocar Senha
              </Button>
            </div>

            <div className="pt-6 border-t border-border-strong">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 rounded-lg bg-error text-white font-medium hover:opacity-90 transition-colors flex items-center justify-center gap-2"
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
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Sair da Conta
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-surface rounded-lg p-6 text-center">
            <p className="text-text-secondary mb-4">
              Você não está autenticado.
            </p>
            <a
              href="/login"
              className="inline-block px-4 py-2 rounded-lg bg-primary text-text-inverse font-medium hover:bg-primary-hover transition-colors"
            >
              Fazer Login
            </a>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={logoutConfirm}
        onClose={() => setLogoutConfirm(false)}
        onConfirm={confirmLogout}
        title="Sair da Conta"
        message="Tem certeza que deseja sair da sua conta?"
        confirmText="Sair"
        cancelText="Cancelar"
        confirmVariant="danger"
      />
    </div>
  );
}
