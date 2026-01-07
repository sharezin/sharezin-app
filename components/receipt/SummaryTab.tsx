'use client';

import { Receipt } from '@/types';
import { formatCurrency } from '@/lib/calculations';
import { ParticipantActionsMenu } from './ParticipantActionsMenu';

interface SummaryTabProps {
  receipt: Receipt;
  participantTotals: Record<string, number>;
  isCreator: boolean;
  currentUserId: string;
  onCloseParticipantParticipation: (participantId: string) => void;
  onRemoveParticipant: (participantId: string) => void;
  closingParticipantId: string | null;
  removingParticipantId: string | null;
}

export function SummaryTab({
  receipt,
  participantTotals,
  isCreator,
  currentUserId,
  onCloseParticipantParticipation,
  onRemoveParticipant,
  closingParticipantId,
  removingParticipantId,
}: SummaryTabProps) {
  if (receipt.participants.length === 0) {
    return (
      <p className="text-zinc-500 dark:text-zinc-400 text-sm">
        Nenhum participante ainda.
      </p>
    );
  }

  return (
    <div className="space-y-2 overflow-visible">
      {receipt.participants
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .map(participant => {
          const total = participantTotals[participant.id] || 0;
          const isParticipantCreator = participant.id === receipt.creatorId;
          const isCurrentUser = participant.id === currentUserId;
          
          return (
            <div
              key={participant.id}
              className={`flex items-center justify-between p-3 rounded-lg relative ${
                participant.isClosed
                  ? 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700'
                  : 'bg-zinc-50 dark:bg-zinc-800'
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={`font-medium text-black dark:text-zinc-50 truncate ${
                  participant.isClosed ? 'line-through opacity-60' : ''
                }`}>
                  {participant.name || 'Sem nome'}
                </span>
                {participant.isClosed && (
                  <span className="text-xs px-2 py-0.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded">
                    Fechado
                  </span>
                )}
                {isParticipantCreator && (
                  <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                    Criador
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-lg font-semibold text-black dark:text-zinc-50">
                  {formatCurrency(total)}
                </span>
                {isCreator && !isCurrentUser && (
                  <ParticipantActionsMenu
                    participantId={participant.id}
                    participantName={participant.name || 'Sem nome'}
                    isClosed={participant.isClosed || false}
                    isCreator={isParticipantCreator}
                    receiptClosed={receipt.isClosed}
                    onCloseParticipation={() => onCloseParticipantParticipation(participant.id)}
                    onRemoveParticipant={() => onRemoveParticipant(participant.id)}
                    closingParticipation={closingParticipantId === participant.id}
                    removingParticipant={removingParticipantId === participant.id}
                  />
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}
