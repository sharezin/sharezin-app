'use client';

import { useMemo } from 'react';
import { Receipt } from '@/types';
import { calculateParticipantTotals, calculateReceiptTotal, roundToTwoDecimals } from '@/lib/calculations';

export function useCalculations(receipt: Receipt | null) {
  const participantTotals = useMemo(() => {
    if (!receipt) return {};
    
    const totals = calculateParticipantTotals(receipt);
    // Arredonda os valores
    const rounded: Record<string, number> = {};
    Object.entries(totals).forEach(([id, value]) => {
      rounded[id] = roundToTwoDecimals(value);
    });
    
    return rounded;
  }, [receipt]);

  const receiptTotal = useMemo(() => {
    if (!receipt) return 0;
    return roundToTwoDecimals(calculateReceiptTotal(receipt));
  }, [receipt]);

  const getParticipantTotal = (participantId: string): number => {
    return participantTotals[participantId] || 0;
  };

  return {
    participantTotals,
    receiptTotal,
    getParticipantTotal,
  };
}

