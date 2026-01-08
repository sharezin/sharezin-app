'use client';

import { useState, useRef, useEffect } from 'react';
import { IconButton } from '@/components/ui/IconButton';

interface ParticipantActionsMenuProps {
  participantId: string;
  participantName: string;
  isClosed: boolean;
  isCreator: boolean;
  receiptClosed: boolean;
  onCloseParticipation: () => void;
  onRemoveParticipant: () => void;
  closingParticipation: boolean;
  removingParticipant: boolean;
}

export function ParticipantActionsMenu({
  participantId,
  participantName,
  isClosed,
  isCreator,
  receiptClosed,
  onCloseParticipation,
  onRemoveParticipant,
  closingParticipation,
  removingParticipant,
}: ParticipantActionsMenuProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showMenu && buttonRef.current && !isCreator) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [showMenu, isCreator]);

  useEffect(() => {
    if (showMenu && !closingParticipation && !removingParticipant && !isCreator) {
      const handleScroll = () => setShowMenu(false);
      const handleResize = () => setShowMenu(false);
      
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [showMenu, closingParticipation, removingParticipant, isCreator]);

  // Não mostrar menu se for o próprio criador
  if (isCreator) {
    return null;
  }

  return (
    <div className="relative" ref={buttonRef}>
      <IconButton
        onClick={() => setShowMenu(!showMenu)}
        aria-label={`Ações para ${participantName}`}
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
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </IconButton>
      {showMenu && menuPosition && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => {
              if (!closingParticipation && !removingParticipant) {
                setShowMenu(false);
              }
            }}
          />
          <div 
            ref={menuRef}
            className="fixed bg-surface rounded-lg border border-border-strong shadow-xl z-[101] w-56" 
            style={{ 
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`,
              maxWidth: 'calc(100vw - 2rem)',
            }}
          >
            {!isClosed && !receiptClosed && (
              <button
                onClick={() => {
                  if (!closingParticipation) {
                    onCloseParticipation();
                  }
                }}
                disabled={closingParticipation}
                className="w-full px-4 py-3 text-left text-sm text-text-primary hover:bg-secondary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-t-lg flex items-center gap-2"
              >
                {closingParticipation ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Fechando...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18 12H6"
                      />
                    </svg>
                    Fechar Participação
                  </>
                )}
              </button>
            )}
            {!isClosed && !receiptClosed && (
              <div className="border-t border-border-strong"></div>
            )}
            <button
              onClick={() => {
                setShowMenu(false);
                onRemoveParticipant();
              }}
              disabled={removingParticipant}
              className={`w-full px-4 py-3 text-left text-sm text-error hover:bg-error/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${!isClosed && !receiptClosed ? 'rounded-b-lg' : 'rounded-lg'} flex items-center gap-2`}
            >
              {removingParticipant ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Removendo...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Excluir Participante
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
