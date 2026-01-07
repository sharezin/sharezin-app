'use client';

import { useState } from 'react';
import { Receipt, ReceiptItem, DeletionRequest } from '@/types';
import { ItemHistoryTab } from './ItemHistoryTab';
import { SummaryTab } from './SummaryTab';

interface ReceiptTabsProps {
  receipt: Receipt;
  sortedItems: ReceiptItem[];
  currentUserId: string;
  isCreator: boolean;
  participantTotals: Record<string, number>;
  getDeletionRequest: (itemId: string) => DeletionRequest | undefined;
  onRemoveItem: (itemId: string) => void;
  onRequestDeletion: (itemId: string) => void;
  onApproveDeletion: (requestId: string) => void;
  onRejectDeletion: (requestId: string) => void;
  requestingDeletionItemId: string | null;
  approvingDeletionRequestId: string | null;
  rejectingDeletionRequestId: string | null;
  onCloseParticipantParticipation: (participantId: string) => void;
  onRemoveParticipant: (participantId: string) => void;
  closingParticipantId: string | null;
  removingParticipantId: string | null;
}

export function ReceiptTabs({
  receipt,
  sortedItems,
  currentUserId,
  isCreator,
  participantTotals,
  getDeletionRequest,
  onRemoveItem,
  onRequestDeletion,
  onApproveDeletion,
  onRejectDeletion,
  requestingDeletionItemId,
  approvingDeletionRequestId,
  rejectingDeletionRequestId,
  onCloseParticipantParticipation,
  onRemoveParticipant,
  closingParticipantId,
  removingParticipantId,
}: ReceiptTabsProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'summary'>('history');

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg">
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
      <div className="p-6 overflow-visible">
        {activeTab === 'history' && (
          <ItemHistoryTab
            items={sortedItems}
            receipt={receipt}
            currentUserId={currentUserId}
            isCreator={isCreator}
            getDeletionRequest={getDeletionRequest}
            onRemoveItem={onRemoveItem}
            onRequestDeletion={onRequestDeletion}
            onApproveDeletion={onApproveDeletion}
            onRejectDeletion={onRejectDeletion}
            requestingDeletionItemId={requestingDeletionItemId}
            approvingDeletionRequestId={approvingDeletionRequestId}
            rejectingDeletionRequestId={rejectingDeletionRequestId}
          />
        )}

        {activeTab === 'summary' && (
          <SummaryTab
            receipt={receipt}
            participantTotals={participantTotals}
            isCreator={isCreator}
            currentUserId={currentUserId}
            onCloseParticipantParticipation={onCloseParticipantParticipation}
            onRemoveParticipant={onRemoveParticipant}
            closingParticipantId={closingParticipantId}
            removingParticipantId={removingParticipantId}
          />
        )}
      </div>
    </div>
  );
}
