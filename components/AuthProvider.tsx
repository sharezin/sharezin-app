'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { checkAuth } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Rotas públicas que não precisam de autenticação
  const publicRoutes = ['/login', '/register'];
  const isPublicRoute = publicRoutes.includes(pathname || '');

  useEffect(() => {
    const verifyAuth = async () => {
      if (isPublicRoute) {
        setIsChecking(false);
        return;
      }

      const authenticated = await checkAuth();
      setIsAuthenticated(authenticated);
      setIsChecking(false);

      if (!authenticated) {
        router.push('/login');
      }
    };

    verifyAuth();
  }, [pathname, isPublicRoute, checkAuth, router]);

  if (isChecking && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Carregando...</p>
      </div>
    );
  }

  if (!isPublicRoute && !isAuthenticated && !isChecking) {
    return null; // Redirecionamento em andamento
  }

  return <>{children}</>;
}

