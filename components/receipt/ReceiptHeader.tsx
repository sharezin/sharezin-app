'use client';

import { Receipt } from '@/types';
import { BackButton } from '@/components/ui/BackButton';
import { ReceiptActionsMenu } from './ReceiptActionsMenu';

interface ReceiptHeaderProps {
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

export function ReceiptHeader({
  receipt,
  isCreator,
  onCloseReceipt,
  onCloseParticipation,
  onShowInviteCode,
  onShowUserReceiptSummary,
  closingReceipt,
  closingParticipation,
  currentUserId,
}: ReceiptHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <BackButton />
        <div className="flex-1">
          <h1 className="text-xl font-bold text-black dark:text-zinc-50">
            {receipt.title}
          </h1>
        </div>
        {!receipt.isClosed && (
          <ReceiptActionsMenu
            receipt={receipt}
            isCreator={isCreator}
            onCloseReceipt={onCloseReceipt}
            onCloseParticipation={onCloseParticipation}
            onShowInviteCode={onShowInviteCode}
            onShowUserReceiptSummary={onShowUserReceiptSummary}
            closingReceipt={closingReceipt}
            closingParticipation={closingParticipation}
            currentUserId={currentUserId}
          />
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
  );
}
