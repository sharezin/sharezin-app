'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useReceipts } from '@/hooks/useReceipts';
import { useCalculations } from '@/hooks/useCalculations';
import { ProductForm } from '@/components/ProductForm';
import { AlertModal, ConfirmModal } from '@/components/Modal';
import { Receipt, ReceiptItem, Participant, DeletionRequest, PendingParticipant } from '@/types';
import { formatCurrency, calculateItemTotal, calculateItemsTotal, calculateServiceChargeAmount } from '@/lib/calculations';

export default function ReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getReceiptById, updateReceipt } = useReceipts();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'summary'>('history');
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
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    itemId: string | null;
  }>({
    isOpen: false,
    itemId: null,
  });
  const [showMenu, setShowMenu] = useState(false);
  const [closeReceiptConfirm, setCloseReceiptConfirm] = useState(false);

  useEffect(() => {
    const id = params.id as string;
    const loadedReceipt = getReceiptById(id);
    
    if (!loadedReceipt) {
      router.push('/');
      return;
    }
    
    setReceipt(loadedReceipt);
    setLoading(false);
  }, [params.id, getReceiptById, router]);

  const { receiptTotal, participantTotals } = useCalculations(receipt);

  // ID do usuário atual (será substituído por conta logada futuramente)
  const currentUserId = 'default-user';

  // Verifica se o usuário atual é o criador do recibo
  const isCreator = receipt?.creatorId === currentUserId;

  const handleAddProduct = (item: ReceiptItem, participant: Participant) => {
    if (!receipt) return;

    if (receipt.isClosed) {
      setAlertModal({
        isOpen: true,
        title: 'Recibo Fechado',
        message: 'Não é possível adicionar produtos a um recibo fechado',
        variant: 'warning',
      });
      return;
    }

    // Verifica se o participante fechou sua participação (mas o criador sempre pode adicionar)
    const currentParticipant = receipt.participants.find(p => p.id === participant.id);
    if (currentParticipant?.isClosed && !isCreator) {
      setAlertModal({
        isOpen: true,
        title: 'Participação Fechada',
        message: 'Você fechou sua participação neste recibo e não pode mais adicionar produtos',
        variant: 'warning',
      });
      return;
    }

    // Verifica se o participante já existe (mesmo nome, case-insensitive)
    const existingParticipant = receipt.participants.find(
      p => p.name.toLowerCase() === participant.name.toLowerCase()
    );

    // Usa o participante existente ou o novo
    const finalParticipant = existingParticipant || participant;

    // Atualiza o participantId do item para usar o ID do participante
    const updatedItem: ReceiptItem = {
      ...item,
      participantId: finalParticipant.id,
    };

    // Adiciona o participante apenas se não existir
    const updatedParticipants = existingParticipant
      ? receipt.participants
      : [...receipt.participants, finalParticipant];

    const updatedReceipt: Receipt = {
      ...receipt,
      items: [...receipt.items, updatedItem],
      participants: updatedParticipants,
    };

    const savedReceipt = updateReceipt(updatedReceipt);
    setReceipt(savedReceipt);
  };

  const handleRemoveItem = (itemId: string) => {
    if (!receipt || !isCreator) return;
    setDeleteConfirm({ isOpen: true, itemId });
  };

  const confirmDeleteItem = () => {
    if (!receipt || !deleteConfirm.itemId) return;
    
    // Remove o item e também remove solicitações relacionadas
    const updatedReceipt: Receipt = {
      ...receipt,
      items: receipt.items.filter(item => item.id !== deleteConfirm.itemId),
      deletionRequests: receipt.deletionRequests.filter(req => req.itemId !== deleteConfirm.itemId),
    };

    const savedReceipt = updateReceipt(updatedReceipt);
    setReceipt(savedReceipt);
    setDeleteConfirm({ isOpen: false, itemId: null });
  };

  const handleRequestDeletion = (itemId: string) => {
    if (!receipt) return;

    // Verifica se já existe uma solicitação para este item
    const existingRequest = receipt.deletionRequests.find(req => req.itemId === itemId);
    if (existingRequest) {
      setAlertModal({
        isOpen: true,
        title: 'Aviso',
        message: 'Você já solicitou a exclusão deste produto',
        variant: 'warning',
      });
      return;
    }

    // Encontra o item para verificar se pertence ao participante atual
    const item = receipt.items.find(i => i.id === itemId);
    if (!item || item.participantId !== currentUserId) {
      setAlertModal({
        isOpen: true,
        title: 'Aviso',
        message: 'Você só pode solicitar a exclusão de produtos que você cadastrou',
        variant: 'warning',
      });
      return;
    }

    const newRequest: DeletionRequest = {
      id: crypto.randomUUID(),
      itemId,
      participantId: currentUserId,
      requestedAt: new Date().toISOString(),
    };

    const updatedReceipt: Receipt = {
      ...receipt,
      deletionRequests: [...receipt.deletionRequests, newRequest],
    };

    const savedReceipt = updateReceipt(updatedReceipt);
    setReceipt(savedReceipt);
    setAlertModal({
      isOpen: true,
      title: 'Sucesso',
      message: 'Solicitação de exclusão enviada ao criador do recibo',
      variant: 'success',
    });
  };

  const handleApproveDeletion = (requestId: string) => {
    if (!receipt || !isCreator) return;

    const request = receipt.deletionRequests.find(req => req.id === requestId);
    if (!request) return;

    // Remove o item e a solicitação
    const updatedReceipt: Receipt = {
      ...receipt,
      items: receipt.items.filter(item => item.id !== request.itemId),
      deletionRequests: receipt.deletionRequests.filter(req => req.id !== requestId),
    };

    const savedReceipt = updateReceipt(updatedReceipt);
    setReceipt(savedReceipt);
  };

  const handleRejectDeletion = (requestId: string) => {
    if (!receipt || !isCreator) return;

    const updatedReceipt: Receipt = {
      ...receipt,
      deletionRequests: receipt.deletionRequests.filter(req => req.id !== requestId),
    };

    const savedReceipt = updateReceipt(updatedReceipt);
    setReceipt(savedReceipt);
  };

  // Verifica se há solicitação pendente para um item
  const getDeletionRequest = (itemId: string): DeletionRequest | undefined => {
    if (!receipt) return undefined;
    return receipt.deletionRequests.find(req => req.itemId === itemId);
  };

  const handleAcceptParticipant = (pendingParticipantId: string) => {
    if (!receipt || !isCreator) return;

    const pendingParticipant = receipt.pendingParticipants.find(p => p.id === pendingParticipantId);
    if (!pendingParticipant) return;

    // Cria o participante
    const newParticipant: Participant = {
      id: pendingParticipant.userId,
      name: pendingParticipant.name,
    };

    // Remove da lista de pendentes e adiciona aos participantes
    const updatedReceipt: Receipt = {
      ...receipt,
      pendingParticipants: receipt.pendingParticipants.filter(p => p.id !== pendingParticipantId),
      participants: [...receipt.participants, newParticipant],
    };

    const savedReceipt = updateReceipt(updatedReceipt);
    setReceipt(savedReceipt);
    
    setAlertModal({
      isOpen: true,
      title: 'Sucesso',
      message: `${pendingParticipant.name} foi adicionado ao recibo`,
      variant: 'success',
    });
  };

  const handleRejectParticipant = (pendingParticipantId: string) => {
    if (!receipt || !isCreator) return;

    const pendingParticipant = receipt.pendingParticipants.find(p => p.id === pendingParticipantId);
    
    const updatedReceipt: Receipt = {
      ...receipt,
      pendingParticipants: receipt.pendingParticipants.filter(p => p.id !== pendingParticipantId),
    };

    const savedReceipt = updateReceipt(updatedReceipt);
    setReceipt(savedReceipt);
    
    if (pendingParticipant) {
      setAlertModal({
        isOpen: true,
        title: 'Participante rejeitado',
        message: `A solicitação de ${pendingParticipant.name} foi rejeitada`,
        variant: 'info',
      });
    }
  };

  const handleCloseReceipt = () => {
    if (!receipt || !isCreator) return;

    const updatedReceipt: Receipt = {
      ...receipt,
      isClosed: true,
    };

    const savedReceipt = updateReceipt(updatedReceipt);
    setReceipt(savedReceipt);
    setShowMenu(false);
    setCloseReceiptConfirm(false);
    
    setAlertModal({
      isOpen: true,
      title: 'Recibo Fechado',
      message: 'O recibo foi fechado. Ninguém poderá mais adicionar produtos.',
      variant: 'success',
    });
  };

  const handleCloseParticipation = () => {
    if (!receipt) return;

    const currentParticipant = receipt.participants.find(p => p.id === currentUserId);
    if (!currentParticipant) return;

    const updatedParticipants = receipt.participants.map(p =>
      p.id === currentUserId ? { ...p, isClosed: true } : p
    );

    const updatedReceipt: Receipt = {
      ...receipt,
      participants: updatedParticipants,
    };

    const savedReceipt = updateReceipt(updatedReceipt);
    setReceipt(savedReceipt);
    setShowMenu(false);
    
    setAlertModal({
      isOpen: true,
      title: 'Participação Fechada',
      message: 'Você fechou sua participação. Não poderá mais adicionar produtos neste recibo.',
      variant: 'success',
    });
  };

  if (loading || !receipt) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Carregando...</p>
      </div>
    );
  }

  // Ordena itens por data de adição (mais recente primeiro)
  const sortedItems = [...receipt.items].sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Voltar"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-black dark:text-zinc-50">
                {receipt.title}
              </h1>
            </div>
            {!receipt.isClosed && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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
              </button>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-lg z-50">
                    {isCreator ? (
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setCloseReceiptConfirm(true);
                        }}
                        disabled={receipt.isClosed}
                        className="w-full px-4 py-3 text-left text-sm text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                      >
                        {receipt.isClosed ? 'Recibo Fechado' : 'Fechar Recibo'}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          const currentParticipant = receipt.participants.find(p => p.id === currentUserId);
                          if (currentParticipant?.isClosed) {
                            setAlertModal({
                              isOpen: true,
                              title: 'Participação já fechada',
                              message: 'Sua participação neste recibo já está fechada',
                              variant: 'info',
                            });
                          } else {
                            setCloseReceiptConfirm(true);
                          }
                        }}
                        disabled={receipt.isClosed || receipt.participants.find(p => p.id === currentUserId)?.isClosed}
                        className="w-full px-4 py-3 text-left text-sm text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                      >
                        {receipt.participants.find(p => p.id === currentUserId)?.isClosed 
                          ? 'Participação Fechada' 
                          : 'Fechar Minha Participação'}
                      </button>
                    )}
                  </div>
                </>
              )}
              </div>
            )}
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm">
            {new Date(receipt.date).toLocaleDateString('pt-BR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>

        {/* Total do Recibo */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-semibold text-black dark:text-zinc-50">
              Total do Recibo
            </span>
            <span className="text-2xl font-bold text-black dark:text-zinc-50">
              {formatCurrency(receiptTotal)}
            </span>
          </div>
          

          {(receipt.serviceChargePercent > 0 || receipt.cover > 0) && (
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <div className="flex justify-between">
                <span>Subtotal (itens):</span>
                <span>{formatCurrency(calculateItemsTotal(receipt))}</span>
              </div>
              {receipt.serviceChargePercent > 0 && (
                <div className="flex justify-between">
                  <span>Taxa do garçom ({receipt.serviceChargePercent}%):</span>
                  <span>{formatCurrency(calculateServiceChargeAmount(receipt))}</span>
                </div>
              )}
              {receipt.cover > 0 && (
                <div className="flex justify-between">
                  <span>Cover:</span>
                  <span>{formatCurrency(receipt.cover)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Participantes Pendentes - Apenas para o criador */}
        {isCreator && receipt.pendingParticipants.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 mb-6 border border-yellow-200 dark:border-yellow-800">
            <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-4">
              Participantes Pendentes ({receipt.pendingParticipants.length})
            </h3>
            <div className="space-y-3">
              {receipt.pendingParticipants.map(pending => (
                <div
                  key={pending.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-black dark:text-zinc-50">
                      {pending.name}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Solicitado em {new Date(pending.requestedAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptParticipant(pending.id)}
                      className="px-3 py-1 text-sm rounded-lg bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                    >
                      Aceitar
                    </button>
                    <button
                      onClick={() => handleRejectParticipant(pending.id)}
                      className="px-3 py-1 text-sm rounded-lg bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Tabs */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'text-black dark:text-zinc-50 border-b-2 border-black dark:border-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50'
              }`}
            >
              Histórico
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'summary'
                  ? 'text-black dark:text-zinc-50 border-b-2 border-black dark:border-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50'
              }`}
            >
              Resumo
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'history' && (
              <div>
                {sortedItems.length === 0 ? (
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                    Nenhum produto adicionado ainda.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {sortedItems.map(item => {
                      const itemTotal = calculateItemTotal(item);
                      const deletionRequest = getDeletionRequest(item.id);
                      const isItemOwner = item.participantId === currentUserId;
                      const canDelete = isCreator;
                      const canRequestDeletion = isItemOwner && !isCreator && !deletionRequest;
                      
                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-lg ${
                            deletionRequest
                              ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                              : 'bg-zinc-50 dark:bg-zinc-800'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-black dark:text-zinc-50">
                                {item.name}
                              </p>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {item.quantity}x {formatCurrency(item.price)} = {formatCurrency(itemTotal)}
                              </p>
                              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                                {new Date(item.addedAt).toLocaleString('pt-BR')}
                              </p>
                              {deletionRequest && (
                                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 font-medium">
                                  ⚠️ Solicitação de exclusão pendente
                                </p>
                              )}
                            </div>
                            <div className="ml-4 flex flex-col gap-2">
                              {canDelete && (
                                <button
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="px-3 py-1 text-sm rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  Excluir
                                </button>
                              )}
                              {canRequestDeletion && (
                                <button
                                  onClick={() => handleRequestDeletion(item.id)}
                                  className="px-3 py-1 text-sm rounded text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                                >
                                  Solicitar Exclusão
                                </button>
                              )}
                              {deletionRequest && isCreator && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleApproveDeletion(deletionRequest.id)}
                                    className="px-2 py-1 text-xs rounded text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                    title="Aprovar"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={() => handleRejectDeletion(deletionRequest.id)}
                                    className="px-2 py-1 text-xs rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    title="Rejeitar"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'summary' && (
              <div>
                {receipt.participants.length === 0 ? (
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                    Nenhum participante ainda.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {receipt.participants
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(participant => {
                        const total = participantTotals[participant.id] || 0;
                        return (
                          <div
                            key={participant.id}
                            className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
                          >
                            <span className="font-medium text-black dark:text-zinc-50">
                              {participant.name}
                            </span>
                            <span className="text-lg font-semibold text-black dark:text-zinc-50">
                              {formatCurrency(total)}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botão flutuante para adicionar produto */}
      {!receipt.isClosed && 
        (isCreator || !receipt.participants.find(p => p.id === currentUserId)?.isClosed) && (
        <button
          onClick={() => setShowProductForm(true)}
          className="fixed bottom-24 right-4 sm:right-6 w-14 h-14 rounded-full bg-black dark:bg-white text-white dark:text-black shadow-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all hover:scale-110 flex items-center justify-center z-40"
          aria-label="Adicionar Produto"
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
        </button>
      )}

      {showProductForm && (
        <ProductForm
          onAdd={handleAddProduct}
          onClose={() => setShowProductForm(false)}
        />
      )}

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
      />

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, itemId: null })}
        onConfirm={confirmDeleteItem}
        title="Excluir Produto"
        message="Tem certeza que deseja excluir este produto do recibo?"
        confirmText="Excluir"
        cancelText="Cancelar"
        confirmVariant="danger"
      />

      <ConfirmModal
        isOpen={closeReceiptConfirm}
        onClose={() => setCloseReceiptConfirm(false)}
        onConfirm={isCreator ? handleCloseReceipt : handleCloseParticipation}
        title={isCreator ? "Fechar Recibo" : "Fechar Minha Participação"}
        message={isCreator 
          ? "Tem certeza que deseja fechar este recibo? Ninguém poderá mais adicionar produtos."
          : "Tem certeza que deseja fechar sua participação? Você não poderá mais adicionar produtos neste recibo."
        }
        confirmText="Fechar"
        cancelText="Cancelar"
        confirmVariant="warning"
      />
    </div>
  );
}
