'use client';

import Link from 'next/link';
import { Receipt } from '@/types';
import { formatCurrency } from '@/lib/calculations';

interface ReceiptCardProps {
  receipt: Receipt;
  href?: string;
}

export function ReceiptCard({ receipt, href }: ReceiptCardProps) {
  const cardContent = (
    <div className="p-4 bg-surface rounded-lg border border-border-strong hover:border-border transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-text-primary mb-1">
            {receipt.title}
          </h3>
          <p className="text-sm text-text-secondary mb-2">
            {new Date(receipt.date).toLocaleDateString('pt-BR')}
          </p>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-text-secondary">
              {receipt.participants.length} participante{receipt.participants.length !== 1 ? 's' : ''}
            </span>
            <span className="text-text-secondary">
              {receipt.items.length} item{receipt.items.length !== 1 ? 's' : ''}
            </span>
            <span className="font-semibold text-text-primary">
              {formatCurrency(receipt.total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
