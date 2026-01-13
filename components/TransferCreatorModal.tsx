'use client';

import { useState } from 'react';
import { Receipt, Participant } from '@/types';
import { apiRequest } from '@/lib/api';
import { transformReceiptFromApi, ApiReceipt } from '@/lib/transformers/receiptTransformer';
import { Modal } from './Modal';
import { AlertModal } from './Modal';

interface TransferCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: Receipt;
  currentUserId: string;
  onTransferComplete: (receipt: Receipt) => void;
  isRequired?: boolean; // Se true, não permite fechar sem transferir
}

export function TransferCreatorModal({
  isOpen,
  onClose,
  receipt,
  currentUserId,
  onTransferComplete,
  isRequired = false,
}: TransferCreatorModalProps) {
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('');
  const [transferring, setTransferring] = useState(false);
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

  // Filtrar participantes elegíveis (abertos, exceto criador atual)
  const eligibleParticipants = receipt.participants.filter(
    (participant: Participant) =>
      participant.id !== receipt.creatorId &&
      !participant.isClosed
  );

  const handleTransfer = async () => {
    if (!selectedParticipantId) {
      setAlertModal({
        isOpen: true,
        title: 'Validação',
        message: 'Por favor, selecione um participante',
        variant: 'warning',
      });
      return;
    }

    setTransferring(true);
    try {
      const response = await apiRequest<{ receipt: ApiReceipt }>(
        `/api/receipts/${receipt.id}/transfer-creator`,
        {
          method: 'PUT',
          body: JSON.stringify({
            newCreatorParticipantId: selectedParticipantId,
          }),
        }
      );

      const updatedReceipt = transformReceiptFromApi(response.receipt);
      onTransferComplete(updatedReceipt);

      setAlertModal({
        isOpen: true,
        title: 'Sucesso',
        message: 'Responsabilidade transferida com sucesso!',
        variant: 'success',
      });

      // Fechar modal após sucesso
      setTimeout(() => {
        setSelectedParticipantId('');
        onClose();
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao transferir responsabilidade';
      setAlertModal({
        isOpen: true,
        title: 'Erro',
        message: errorMessage,
        variant: 'error',
      });
    } finally {
      setTransferring(false);
    }
  };

  const handleClose = () => {
    if (!isRequired && !transferring) {
      setSelectedParticipantId('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={isRequired ? 'Transferir Responsabilidade' : 'Transferir Criador'}
        showCloseButton={!isRequired}
      >
        {eligibleParticipants.length === 0 ? (
          <div className="space-y-4">
            <div className="p-4 bg-warning/10 rounded-lg border border-warning/30">
              <p className="text-warning font-medium">
                Nenhum participante disponível
              </p>
              <p className="text-text-secondary text-sm mt-1">
                Não há participantes elegíveis para receber a responsabilidade. 
                É necessário ter pelo menos um participante ativo (que não fechou sua participação).
              </p>
            </div>
            {!isRequired && (
              <button
                onClick={handleClose}
                className="w-full px-4 py-3 rounded-lg bg-primary text-text-inverse font-medium hover:bg-primary-hover transition-colors"
              >
                Fechar
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-text-secondary text-sm">
              {isRequired
                ? 'Antes de fechar sua participação, você precisa transferir a responsabilidade do recibo para outro participante.'
                : 'Selecione o participante que será o novo responsável pelo recibo:'}
            </p>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {eligibleParticipants.map((participant: Participant) => (
                <button
                  key={participant.id}
                  onClick={() => setSelectedParticipantId(participant.id)}
                  disabled={transferring}
                  className={`w-full p-3 rounded-lg border text-left transition-colors disabled:opacity-50 ${
                    selectedParticipantId === participant.id
                      ? 'bg-primary/10 border-primary text-text-primary'
                      : 'bg-surface border-border hover:bg-secondary-hover text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedParticipantId === participant.id
                        ? 'border-primary bg-primary'
                        : 'border-border'
                    }`}>
                      {selectedParticipantId === participant.id && (
                        <div className="w-2 h-2 rounded-full bg-text-inverse" />
                      )}
                    </div>
                    <span className="font-medium">{participant.name || 'Sem nome'}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              {!isRequired && (
                <button
                  onClick={handleClose}
                  disabled={transferring}
                  className="flex-1 px-4 py-3 rounded-lg border border-border text-text-primary hover:bg-secondary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={handleTransfer}
                disabled={!selectedParticipantId || transferring}
                className={`${isRequired ? 'w-full' : 'flex-1'} px-4 py-3 rounded-lg bg-primary text-text-inverse font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                {transferring ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Transferindo...
                  </>
                ) : (
                  'Transferir'
                )}
              </button>
            </div>
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
