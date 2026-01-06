'use client';

import { useState } from 'react';
import { apiRequest, transformToCamelCase } from '@/lib/api';
import { Receipt } from '@/types';
import { AlertModal } from './Modal';

interface SearchReceiptProps {
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
}

interface ApiReceipt {
  id: string;
  title: string;
  date: string;
  creator_id: string;
  invite_code: string;
  participants: any[];
  pending_participants: any[];
  items: any[];
  deletion_requests: any[];
  service_charge_percent: number;
  cover: number;
  total: number;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
}

export function SearchReceipt({ onClose, currentUserId, currentUserName }: SearchReceiptProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [foundReceipt, setFoundReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(false);
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

  const transformReceiptFromApi = (apiReceipt: ApiReceipt): Receipt => {
    return {
      id: apiReceipt.id,
      title: apiReceipt.title,
      date: apiReceipt.date,
      creatorId: apiReceipt.creator_id,
      inviteCode: apiReceipt.invite_code,
      participants: transformToCamelCase(apiReceipt.participants || []),
      pendingParticipants: transformToCamelCase(apiReceipt.pending_participants || []),
      items: transformToCamelCase(apiReceipt.items || []),
      deletionRequests: transformToCamelCase(apiReceipt.deletion_requests || []),
      serviceChargePercent: apiReceipt.service_charge_percent || 0,
      cover: apiReceipt.cover || 0,
      total: apiReceipt.total || 0,
      isClosed: apiReceipt.is_closed || false,
      createdAt: apiReceipt.created_at,
      updatedAt: apiReceipt.updated_at,
    };
  };

  const handleSearch = async () => {
    if (!inviteCode.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Validação',
        message: 'Por favor, informe o código de convite',
        variant: 'warning',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest<{ receipt: ApiReceipt }>(
        `/api/receipts/invite/${inviteCode.trim().toUpperCase()}`
      );
      
      const receipt = transformReceiptFromApi(response.receipt);
      
      // Verifica se é o criador/dono do recibo
      if (receipt.creatorId === currentUserId) {
        setAlertModal({
          isOpen: true,
          title: 'Aviso',
          message: 'Você é o responsável por este recibo. Não é necessário entrar novamente.',
          variant: 'warning',
        });
        setLoading(false);
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
        setLoading(false);
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
        setLoading(false);
        return;
      }

      setFoundReceipt(receipt);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar recibo';
      setAlertModal({
        isOpen: true,
        title: 'Não encontrado',
        message: errorMessage.includes('404') || errorMessage.includes('Not Found')
          ? 'Nenhum recibo encontrado com este código de convite'
          : errorMessage,
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestJoin = async () => {
    if (!foundReceipt) return;

    try {
      const response = await apiRequest<{ message: string; pendingParticipant: any }>(
        `/api/receipts/${foundReceipt.id}/request-join`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: currentUserName,
          }),
        }
      );
      
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao enviar solicitação. Tente novamente.';
      setAlertModal({
        isOpen: true,
        title: 'Erro',
        message: errorMessage,
        variant: 'error',
      });
    }
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
                    if (e.key === 'Enter' && !loading) handleSearch();
                  }}
                  placeholder="Digite o código (ex: ABC123)"
                  autoFocus
                  maxLength={6}
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-center text-2xl font-bold tracking-wider uppercase disabled:opacity-50"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSearch}
                  disabled={loading || !inviteCode.trim()}
                  className="flex-1 px-4 py-3 rounded-lg bg-black dark:bg-white text-white dark:text-black font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Buscando...' : 'Buscar'}
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
