'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ConfirmModal } from '@/components/Modal';

export default function ProfilePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [logoutConfirm, setLogoutConfirm] = useState(false);

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
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black dark:text-zinc-50 mb-2">
            Perfil
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Informações da sua conta
          </p>
        </div>

        {user ? (
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-zinc-500 dark:text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
                  {user.name}
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {user.email}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                  ID: {user.id}
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-200 dark:border-zinc-700">
              <button
                onClick={handleChangePassword}
                className="w-full px-4 py-3 rounded-lg bg-black dark:bg-white text-white dark:text-black font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
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
              </button>
            </div>

            <div className="pt-6 border-t border-zinc-200 dark:border-zinc-700">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 rounded-lg bg-red-600 dark:bg-red-500 text-white font-medium hover:bg-red-700 dark:hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
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
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 text-center">
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Você não está autenticado.
            </p>
            <a
              href="/login"
              className="inline-block px-4 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
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
