'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { Receipt } from '@/types';
import { transformReceiptFromApi, ApiReceipt } from '@/lib/transformers/receiptTransformer';
import { Modal } from './Modal';
import { AlertModal } from './Modal';

interface CreateOrJoinReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
}

type ViewMode = 'options' | 'join';

export function CreateOrJoinReceiptModal({ 
  isOpen, 
  onClose, 
  currentUserId, 
  currentUserName 
}: CreateOrJoinReceiptModalProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('options');
  const [inviteCode, setInviteCode] = useState('');
  const [foundReceipt, setFoundReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [requestingJoin, setRequestingJoin] = useState(false);
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

  const handleCreateReceipt = () => {
    onClose();
    router.push('/receipt/new');
  };

  const handleJoinReceipt = () => {
    setViewMode('join');
    setInviteCode('');
    setFoundReceipt(null);
  };

  const handleBackToOptions = () => {
    setViewMode('options');
    setInviteCode('');
    setFoundReceipt(null);
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
    if (!foundReceipt || requestingJoin) return;

    setRequestingJoin(true);
    try {
      await apiRequest<{ message: string; pendingParticipant: any }>(
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
        setViewMode('options');
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
    } finally {
      setRequestingJoin(false);
    }
  };

  const handleClose = () => {
    setViewMode('options');
    setInviteCode('');
    setFoundReceipt(null);
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title="Adicionar Recibo" showCloseButton={true}>
        {viewMode === 'options' ? (
          <div className="space-y-4">
            <button
              onClick={handleCreateReceipt}
              className="w-full px-6 py-4 rounded-lg bg-primary text-text-inverse font-medium hover:bg-primary-hover transition-colors flex items-center justify-center gap-3"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Criar Recibo</span>
            </button>

            <button
              onClick={handleJoinReceipt}
              className="w-full px-6 py-4 rounded-lg border-2 border-primary text-primary font-medium hover:bg-primary/10 transition-colors flex items-center justify-center gap-3"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <span>Entrar em um Recibo</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {!foundReceipt ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
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
                    className="w-full px-4 py-3 rounded-lg border border-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary text-center text-2xl font-bold tracking-wider uppercase disabled:opacity-50"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleBackToOptions}
                    disabled={loading}
                    className="flex-1 px-4 py-3 rounded-lg border border-border text-text-primary hover:bg-secondary-hover transition-colors disabled:opacity-50"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleSearch}
                    disabled={loading || !inviteCode.trim()}
                    className="flex-1 px-4 py-3 rounded-lg bg-primary text-text-inverse font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-success/10 rounded-lg border border-success/30">
                  <p className="text-success font-medium mb-2">
                    Recibo encontrado!
                  </p>
                  <p className="text-text-primary font-semibold">
                    {foundReceipt.title}
                  </p>
                  <p className="text-sm text-text-secondary mt-1">
                    Criado em {new Date(foundReceipt.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setFoundReceipt(null);
                      setInviteCode('');
                    }}
                    className="flex-1 px-4 py-3 rounded-lg border border-border text-text-primary hover:bg-secondary-hover transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleRequestJoin}
                    disabled={requestingJoin}
                    className="flex-1 px-4 py-3 rounded-lg bg-primary text-text-inverse font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {requestingJoin ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Enviando...
                      </>
                    ) : (
                      'Solicitar Entrada'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

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
