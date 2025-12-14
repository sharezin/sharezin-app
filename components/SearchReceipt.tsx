'use client';

import { useState } from 'react';
import { useReceipts } from '@/hooks/useReceipts';
import { getReceiptByInviteCode } from '@/lib/storage';
import { Receipt, PendingParticipant } from '@/types';
import { AlertModal } from './Modal';

interface SearchReceiptProps {
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
}

export function SearchReceipt({ onClose, currentUserId, currentUserName }: SearchReceiptProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [foundReceipt, setFoundReceipt] = useState<Receipt | null>(null);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: 'info' | 'success' | 'warning' | 'error';
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
  });
  const { updateReceipt } = useReceipts();

  const handleSearch = () => {
    if (!inviteCode.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Validação',
        message: 'Por favor, informe o código de convite',
        variant: 'warning',
      });
      return;
    }

    const receipt = getReceiptByInviteCode(inviteCode.trim());
    
    if (!receipt) {
      setAlertModal({
        isOpen: true,
        title: 'Não encontrado',
        message: 'Nenhum recibo encontrado com este código de convite',
        variant: 'error',
      });
      return;
    }

    // Verifica se já é participante
    const isParticipant = receipt.participants.some(p => p.id === currentUserId);
    if (isParticipant) {
      setAlertModal({
        isOpen: true,
        title: 'Aviso',
        message: 'Você já é participante deste recibo',
        variant: 'warning',
      });
      return;
    }

    // Verifica se já está pendente
    const isPending = receipt.pendingParticipants.some(p => p.userId === currentUserId);
    if (isPending) {
      setAlertModal({
        isOpen: true,
        title: 'Aviso',
        message: 'Você já solicitou entrada neste recibo. Aguarde a aprovação do criador.',
        variant: 'info',
      });
      return;
    }

    setFoundReceipt(receipt);
  };

  const handleRequestJoin = () => {
    if (!foundReceipt) return;

    const newPendingParticipant: PendingParticipant = {
      id: crypto.randomUUID(),
      name: currentUserName,
      userId: currentUserId,
      requestedAt: new Date().toISOString(),
    };

    const updatedReceipt: Receipt = {
      ...foundReceipt,
      pendingParticipants: [...foundReceipt.pendingParticipants, newPendingParticipant],
    };

    updateReceipt(updatedReceipt);
    
    setAlertModal({
      isOpen: true,
      title: 'Sucesso',
      message: 'Solicitação de entrada enviada! O criador do recibo será notificado.',
      variant: 'success',
    });

    setTimeout(() => {
      setFoundReceipt(null);
      setInviteCode('');
      onClose();
    }, 2000);
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-end bg-black/50 sm:items-center sm:justify-center backdrop-blur-sm" 
        onClick={onClose}
        style={{ zIndex: 9999, position: 'fixed' }}
      >
        <div
          className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'relative', zIndex: 10000 }}
        >
          <h2 className="text-xl font-semibold mb-4 text-black dark:text-zinc-50">
            Buscar Recibo
          </h2>

          {!foundReceipt ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
                  Código de Convite
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  placeholder="Digite o código (ex: ABC123)"
                  autoFocus
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-center text-2xl font-bold tracking-wider uppercase"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSearch}
                  className="flex-1 px-4 py-3 rounded-lg bg-black dark:bg-white text-white dark:text-black font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                >
                  Buscar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-green-600 dark:text-green-400 font-medium mb-2">
                  Recibo encontrado!
                </p>
                <p className="text-black dark:text-zinc-50 font-semibold">
                  {foundReceipt.title}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  Criado em {new Date(foundReceipt.date).toLocaleDateString('pt-BR')}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setFoundReceipt(null);
                    setInviteCode('');
                  }}
                  className="flex-1 px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={handleRequestJoin}
                  className="flex-1 px-4 py-3 rounded-lg bg-black dark:bg-white text-white dark:text-black font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                >
                  Solicitar Entrada
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
      />
    </>
  );
}

