'use client';

import { Receipt, Participant } from '@/types';
import { useCalculations } from '@/hooks/useCalculations';
import { formatCurrency, calculateServiceChargeAmount } from '@/lib/calculations';

interface SummaryCardProps {
  receipt: Receipt;
}

export function SummaryCard({ receipt }: SummaryCardProps) {
  const { participantTotals, receiptTotal } = useCalculations(receipt);
  const serviceChargeAmount = calculateServiceChargeAmount(receipt);

  const sortedParticipants = [...receipt.participants].sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  return (
    <div className="bg-secondary-soft rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-semibold text-text-primary">
        Resumo
      </h3>

      <div className="space-y-2">
        {sortedParticipants.map(participant => {
          const total = participantTotals[participant.id] || 0;
          return (
            <div
              key={participant.id}
              className="flex items-center justify-between p-3 bg-surface-alt rounded-lg"
            >
              <span className="text-text-primary font-medium">
                {participant.name}
              </span>
              <span className="text-lg font-semibold text-text-primary">
                {formatCurrency(total)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-border-strong">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-text-primary">
            Total
          </span>
          <span className="text-xl font-bold text-text-primary">
            {formatCurrency(receiptTotal)}
          </span>
        </div>
      </div>

      {(serviceChargeAmount > 0 || receipt.cover > 0) && (
        <div className="pt-2 space-y-1 text-sm text-text-secondary">
          {serviceChargeAmount > 0 && (
            <div className="flex justify-between">
              <span>Taxa do garçom ({receipt.serviceChargePercent}%):</span>
              <span>{formatCurrency(serviceChargeAmount)}</span>
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
  );
}

