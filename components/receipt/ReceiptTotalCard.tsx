'use client';

import { Receipt } from '@/types';
import { formatCurrency, calculateItemsTotal, calculateServiceChargeAmount } from '@/lib/calculations';
import { generateReceiptPDF } from '@/lib/services/pdfService';
import { Button } from '@/components/ui/Button';

interface ReceiptTotalCardProps {
  receipt: Receipt;
  receiptTotal: number;
}

export function ReceiptTotalCard({ receipt, receiptTotal }: ReceiptTotalCardProps) {
  const itemsTotal = calculateItemsTotal(receipt);
  const serviceChargeAmount = calculateServiceChargeAmount(receipt);

  const handleGeneratePDF = async () => {
    try {
      await generateReceiptPDF(receipt);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    }
  };

  return (
    <div className="bg-surface rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-lg font-semibold text-text-primary">
          Total do Recibo
        </span>
        <span className="text-2xl font-bold text-text-primary">
          {formatCurrency(receiptTotal)}
        </span>
      </div>

      {(receipt.serviceChargePercent > 0 || receipt.cover > 0) && (
        <div className="pt-4 border-t border-border-strong space-y-1 text-sm text-text-secondary">
          <div className="flex justify-between">
            <span>Subtotal (itens):</span>
            <span>{formatCurrency(itemsTotal)}</span>
          </div>
          {receipt.serviceChargePercent > 0 && (
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

      {receipt.isClosed && (
        <div className="pt-4 mt-4 border-t border-border-strong">
          <Button
            onClick={handleGeneratePDF}
            variant="secondary"
            className="w-full"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Baixar Recibo em PDF
          </Button>
        </div>
      )}
    </div>
  );
}
