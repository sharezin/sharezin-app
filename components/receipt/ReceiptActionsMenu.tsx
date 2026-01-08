'use client';

import { useState } from 'react';
import { Receipt } from '@/types';
import { IconButton } from '@/components/ui/IconButton';

interface ReceiptActionsMenuProps {
  receipt: Receipt;
  isCreator: boolean;
  onCloseReceipt: () => void;
  onCloseParticipation: () => void;
  onShowInviteCode: () => void;
  onShowUserReceiptSummary: () => void;
  closingReceipt: boolean;
  closingParticipation: boolean;
  currentUserId: string;
}

export function ReceiptActionsMenu({
  receipt,
  isCreator,
  onCloseReceipt,
  onCloseParticipation,
  onShowInviteCode,
  onShowUserReceiptSummary,
  closingReceipt,
  closingParticipation,
  currentUserId,
}: ReceiptActionsMenuProps) {
  const [showMenu, setShowMenu] = useState(false);

  const currentParticipant = receipt.participants.find(p => p.id === currentUserId);
  const isParticipantClosed = currentParticipant?.isClosed || false;

  return (
    <div className="relative">
      <IconButton
        onClick={() => setShowMenu(!showMenu)}
        aria-label="Menu de opções"
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
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-56 bg-surface rounded-lg border border-border-strong shadow-lg z-50">
            <button
              onClick={() => {
                setShowMenu(false);
                onShowUserReceiptSummary();
              }}
              className="w-full px-4 py-3 text-left text-sm text-text-primary hover:bg-secondary-hover transition-colors rounded-t-lg flex items-center gap-2"
            >
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Meus Gastos
            </button>
            <div className="border-t border-border-strong"></div>
            <button
              onClick={() => {
                setShowMenu(false);
                onShowInviteCode();
              }}
              className="w-full px-4 py-3 text-left text-sm text-text-primary hover:bg-secondary-hover transition-colors flex items-center gap-2"
            >
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
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Ver Código de Convite
            </button>
            <div className="border-t border-border-strong"></div>
            {isCreator ? (
              <button
                onClick={() => {
                  setShowMenu(false);
                  onCloseReceipt();
                }}
                disabled={receipt.isClosed || closingReceipt}
                className="w-full px-4 py-3 text-left text-sm text-text-primary hover:bg-secondary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-b-lg flex items-center gap-2"
              >
                {closingReceipt ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Fechando...
                  </>
                ) : receipt.isClosed ? (
                  'Recibo Fechado'
                ) : (
                  'Fechar Recibo'
                )}
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowMenu(false);
                  onCloseParticipation();
                }}
                disabled={receipt.isClosed || isParticipantClosed || closingParticipation}
                className="w-full px-4 py-3 text-left text-sm text-text-primary hover:bg-secondary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-b-lg flex items-center gap-2"
              >
                {closingParticipation ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Fechando...
                  </>
                ) : isParticipantClosed ? (
                  'Participação Fechada'
                ) : (
                  'Fechar Minha Participação'
                )}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
