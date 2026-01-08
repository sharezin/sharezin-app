'use client';

import { Receipt, ReceiptItem, DeletionRequest } from '@/types';
import { formatCurrency, calculateItemTotal } from '@/lib/calculations';
import { Button } from '@/components/ui/Button';

interface ItemHistoryTabProps {
  items: ReceiptItem[];
  receipt: Receipt;
  currentUserId: string;
  isCreator: boolean;
  getDeletionRequest: (itemId: string) => DeletionRequest | undefined;
  onRemoveItem: (itemId: string) => void;
  onRequestDeletion: (itemId: string) => void;
  onApproveDeletion: (requestId: string) => void;
  onRejectDeletion: (requestId: string) => void;
  requestingDeletionItemId: string | null;
  approvingDeletionRequestId: string | null;
  rejectingDeletionRequestId: string | null;
}

export function ItemHistoryTab({
  items,
  receipt,
  currentUserId,
  isCreator,
  getDeletionRequest,
  onRemoveItem,
  onRequestDeletion,
  onApproveDeletion,
  onRejectDeletion,
  requestingDeletionItemId,
  approvingDeletionRequestId,
  rejectingDeletionRequestId,
}: ItemHistoryTabProps) {
  if (items.length === 0) {
    return (
      <p className="text-text-muted text-sm">
        Nenhum produto adicionado ainda.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map(item => {
        const itemTotal = calculateItemTotal(item);
        const deletionRequest = getDeletionRequest(item.id);
        const isItemOwner = item.participantId === currentUserId;
        const canDelete = isCreator && !receipt.isClosed && !deletionRequest;
        const canRequestDeletion = isItemOwner && !isCreator && !deletionRequest && !receipt.isClosed;

        return (
          <div
            key={item.id}
            className={`p-4 rounded-lg ${
              deletionRequest
                ? 'bg-warning/10 border border-warning/30'
                : 'bg-secondary-soft'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <p className="font-medium text-text-primary">
                  {item.name}
                </p>
                <p className="text-sm text-text-secondary">
                  {item.quantity}x {formatCurrency(item.price)} = {formatCurrency(itemTotal)}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {new Date(item.addedAt).toLocaleString('pt-BR')}
                </p>
                {deletionRequest && (
                  <p className="text-xs text-warning mt-2 font-medium">
                    ⚠️ Solicitação de exclusão pendente
                  </p>
                )}
              </div>
              <div className="ml-4 flex flex-col gap-2">
                {canDelete && (
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="px-3 py-1 text-sm rounded text-error bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  >
                    Excluir
                  </button>
                )}
                {canRequestDeletion && (
                  <Button
                    onClick={() => onRequestDeletion(item.id)}
                    disabled={requestingDeletionItemId === item.id}
                    variant="warning"
                    className="px-3 py-1 text-sm"
                    loading={requestingDeletionItemId === item.id}
                  >
                    Solicitar Exclusão
                  </Button>
                )}
                {deletionRequest && isCreator && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => onApproveDeletion(deletionRequest.id)}
                      disabled={approvingDeletionRequestId !== null || rejectingDeletionRequestId !== null}
                      variant="primary"
                      className="px-3 py-1 text-sm"
                      loading={approvingDeletionRequestId === deletionRequest.id}
                    >
                      Aceitar
                    </Button>
                    <Button
                      onClick={() => onRejectDeletion(deletionRequest.id)}
                      disabled={approvingDeletionRequestId !== null || rejectingDeletionRequestId !== null}
                      variant="danger"
                      className="px-3 py-1 text-sm"
                      loading={rejectingDeletionRequestId === deletionRequest.id}
                    >
                      Recusar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
