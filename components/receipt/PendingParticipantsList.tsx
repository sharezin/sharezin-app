'use client';

import { PendingParticipant } from '@/types';
import { Button } from '@/components/ui/Button';

interface PendingParticipantsListProps {
  pendingParticipants: PendingParticipant[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  acceptingId: string | null;
  rejectingId: string | null;
}

export function PendingParticipantsList({
  pendingParticipants,
  onAccept,
  onReject,
  acceptingId,
  rejectingId,
}: PendingParticipantsListProps) {
  if (pendingParticipants.length === 0) return null;

  return (
    <div className="bg-warning/10 rounded-lg p-6 mb-6 border border-warning/30">
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        Participantes Pendentes ({pendingParticipants.length})
      </h3>
      <div className="space-y-3">
        {pendingParticipants.map(pending => {
          const isProcessing = acceptingId === pending.id || rejectingId === pending.id;
          const isDisabled = acceptingId !== null || rejectingId !== null;

          return (
            <div
              key={pending.id}
              className="flex items-center justify-between p-3 bg-surface rounded-lg"
            >
              <div className="flex-1">
                <p className="font-medium text-text-primary">
                  {pending.name}
                </p>
                <p className="text-xs text-text-muted">
                  Solicitado em {new Date(pending.requestedAt).toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => onAccept(pending.id)}
                  disabled={isDisabled}
                  variant="success"
                  className="px-3 py-1 text-sm"
                  loading={acceptingId === pending.id}
                >
                  {acceptingId === pending.id ? 'Aceitando...' : 'Aceitar'}
                </Button>
                <Button
                  onClick={() => onReject(pending.id)}
                  disabled={isDisabled}
                  variant="danger"
                  className="px-3 py-1 text-sm"
                  loading={rejectingId === pending.id}
                >
                  {rejectingId === pending.id ? 'Rejeitando...' : 'Rejeitar'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
