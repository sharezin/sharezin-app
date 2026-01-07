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

    const isCreator = receipt.creatorId === currentUserId;
    const isParticipant = receipt.participants.some(p => p.id === currentUserId);
    const currentParticipant = receipt.participants.find(p => p.id === currentUserId);
    const isParticipantClosed = currentParticipant?.isClosed || false;

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
