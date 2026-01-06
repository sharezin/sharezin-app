'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface RouteGuardProps {
  children: React.ReactNode;
}

// Componente para proteger rotas e verificar autenticação
// Agora usa o Context compartilhado, evitando múltiplas requisições
export function RouteGuard({ children }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, checkAuth } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  // Rotas públicas que não precisam de autenticação
  const publicRoutes = ['/login', '/register'];
  const isPublicRoute = publicRoutes.includes(pathname || '');

  useEffect(() => {
    const verifyAuth = async () => {
      if (isPublicRoute) {
        setIsChecking(false);
        return;
      }

      // Se já temos o usuário carregado do Context, não precisa verificar novamente
      if (user) {
        setIsChecking(false);
        return;
      }

      // Se ainda está carregando do Context, aguardar
      if (loading) {
        return;
      }

      // Se não há usuário e não está carregando, verificar autenticação
      const authenticated = await checkAuth();
      setIsChecking(false);

      if (!authenticated) {
        router.push('/login');
      }
    };

    verifyAuth();
  }, [pathname, isPublicRoute, user, loading, checkAuth, router]);

  if (isChecking && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Carregando...</p>
      </div>
    );
  }

  if (!isPublicRoute && !user && !loading && !isChecking) {
    return null; // Redirecionamento em andamento
  }

  return <>{children}</>;
}
