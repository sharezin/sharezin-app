'use client';

import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  enabled?: boolean;
  threshold?: number; // Distância em pixels para ativar o refresh
}

export function usePullToRefresh({ 
  onRefresh, 
  enabled = true,
  threshold = 80 
}: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef<number | null>(null);
  const isPulling = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Só ativar se estiver no topo da página
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || startY.current === null) return;

      const currentY = e.touches[0].clientY;
      const distance = currentY - startY.current;

      // Só permitir pull para baixo
      if (distance > 0 && window.scrollY === 0) {
        e.preventDefault(); // Prevenir scroll padrão
        const limitedDistance = Math.min(distance, threshold * 1.5);
        setPullDistance(limitedDistance);
      } else {
        isPulling.current = false;
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling.current || startY.current === null) {
        setPullDistance(0);
        return;
      }

      // Usar o valor atual do pullDistance através de uma função de callback
      setPullDistance((currentDistance) => {
        if (currentDistance >= threshold && !isRefreshing) {
          setIsRefreshing(true);
          onRefresh()
            .then(() => {
              setIsRefreshing(false);
              setPullDistance(0);
            })
            .catch((error) => {
              console.error('Error refreshing:', error);
              setIsRefreshing(false);
              setPullDistance(0);
            });
        } else {
          setPullDistance(0);
        }
        return 0;
      });

      startY.current = null;
      isPulling.current = false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, onRefresh, threshold, isRefreshing]);

  return {
    isRefreshing,
    pullDistance,
    pullProgress: Math.min(pullDistance / threshold, 1),
  };
}
