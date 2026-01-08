'use client';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  pullProgress: number;
  isRefreshing: boolean;
}

export function PullToRefreshIndicator({ 
  pullDistance, 
  pullProgress, 
  isRefreshing 
}: PullToRefreshIndicatorProps) {
  if (pullDistance <= 0) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 flex items-center justify-center z-50 transition-opacity duration-200"
      style={{
        transform: `translateY(${Math.min(pullDistance, 80)}px)`,
        opacity: Math.min(pullProgress, 1),
      }}
    >
      <div className="bg-surface-alt text-text-inverse px-4 py-2 rounded-b-lg shadow-lg flex items-center gap-2">
        {isRefreshing ? (
          <>
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm font-medium">Atualizando...</span>
          </>
        ) : (
          <>
            <svg 
              className="h-5 w-5 transition-transform duration-200" 
              style={{ transform: `rotate(${pullProgress * 180}deg)` }}
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span className="text-sm font-medium">
              {pullProgress >= 1 ? 'Solte para atualizar' : 'Puxe para atualizar'}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
