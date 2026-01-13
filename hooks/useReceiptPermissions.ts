'use client';

import { useMemo } from 'react';
import { Receipt } from '@/types';

interface UseReceiptPermissionsProps {
  receipt: Receipt | null;
  currentUserId: string;
}

export function useReceiptPermissions({ receipt, currentUserId }: UseReceiptPermissionsProps) {
  return useMemo(() => {
    if (!receipt) {
      return {
        isCreator: false,
        isParticipant: false,
        canModifyReceipt: false,
        canAddItems: false,
        canCloseReceipt: false,
        canCloseParticipation: false,
      };
    }

    // Verificar se é criador comparando creatorId (user_id) com currentUserId (user_id)
    const isCreator = receipt.creatorId === currentUserId;
    
    // Verificar se é participante - pode ser por participant.id OU participant.userId
    const isParticipant = receipt.participants.some(
      p => p.id === currentUserId || p.userId === currentUserId
    );
    
    // Encontrar o participante atual - pode ser por participant.id OU participant.userId
    const currentParticipant = receipt.participants.find(
      p => p.id === currentUserId || p.userId === currentUserId
    );
    const isParticipantClosed = currentParticipant?.isClosed || false;

    // Log para debug
    if (receipt.creatorId && currentUserId) {
      console.log('[useReceiptPermissions] Verificação:', {
        receiptId: receipt.id,
        receiptCreatorId: receipt.creatorId,
        currentUserId,
        isCreator,
        participants: receipt.participants.map(p => ({
          id: p.id,
          userId: p.userId,
          isCurrentUser: p.id === currentUserId || p.userId === currentUserId,
        })),
      });
    }

    return {
      isCreator,
      isParticipant,
      canModifyReceipt: isCreator && !receipt.isClosed,
      canAddItems: !receipt.isClosed && (isCreator || !isParticipantClosed),
      canCloseReceipt: isCreator && !receipt.isClosed,
      canCloseParticipation: isParticipant && !receipt.isClosed && !isParticipantClosed,
    };
  }, [receipt, currentUserId]);
}
