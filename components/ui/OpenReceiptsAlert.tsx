'use client';

import { Receipt } from '@/types';
import { formatCurrency } from '@/lib/calculations';
import Link from 'next/link';

interface OpenReceiptsAlertProps {
  receipts: Receipt[];
}

export function OpenReceiptsAlert({ receipts }: OpenReceiptsAlertProps) {
  const openReceipts = receipts.filter(r => !r.isClosed);

  if (openReceipts.length === 0) {
    return null;
  }

  // Mostra apenas o primeiro recibo aberto como alerta
  const firstReceipt = openReceipts[0];

  return (
    <div className="mb-6">
      <Link 
        href={`/receipt/${firstReceipt.id}`}
        className="block rounded-lg p-4 transition-colors border open-receipt-alert"
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary mb-1">
                  Recibo Aberto
                </h3>
                <p className="text-sm text-text-secondary mb-1">
                  {firstReceipt.title}
                </p>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span>
                    {new Date(firstReceipt.date).toLocaleDateString('pt-BR')}
                  </span>
                  <span>
                    {firstReceipt.participants.length} participante{firstReceipt.participants.length !== 1 ? 's' : ''}
                  </span>
                  <span className="font-semibold text-text-primary">
                    {formatCurrency(firstReceipt.total)}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-success">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
              <span>Toque para ver detalhes</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
