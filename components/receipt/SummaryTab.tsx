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
      <p className="text-text-muted text-sm">
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
          // Verificar se é criador comparando user_id do participante com creatorId do recibo
          const isParticipantCreator = participant.userId === receipt.creatorId;
          const isCurrentUser = participant.id === currentUserId || participant.userId === currentUserId;
          
          return (
            <div
              key={participant.id}
              className={`flex items-center justify-between gap-3 p-3 rounded-lg relative ${
                participant.isClosed
                  ? 'bg-secondary-soft border border-border-strong'
                  : 'bg-secondary-soft'
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={`font-medium text-text-primary truncate ${
                  participant.isClosed && !isParticipantCreator ? 'line-through opacity-60' : ''
                }`}>
                  {participant.name || 'Sem nome'}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {participant.isClosed && !isParticipantCreator && (
                    <span className="text-xs px-2 py-0.5 bg-secondary text-text-secondary rounded whitespace-nowrap">
                      Fechado
                    </span>
                  )}
                  {isParticipantCreator && (
                    <span className="text-xs px-2 py-0.5 bg-info/20 text-info rounded whitespace-nowrap">
                      Criador
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-lg font-semibold text-text-primary">
                  {formatCurrency(total)}
                </span>
                {isCreator && !isCurrentUser && !receipt.isClosed && (
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
