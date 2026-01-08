'use client';

import { useState } from 'react';
import { Modal } from './Modal';

interface InviteCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteCode: string;
  receiptTitle: string;
}

export function InviteCodeModal({ isOpen, onClose, inviteCode, receiptTitle }: InviteCodeModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Erro ao copiar - silencioso
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Código de Convite" showCloseButton={true}>
      <div className="space-y-4">
        <p className="text-text-secondary">
          Compartilhe este código para que outros participantes possam acessar o recibo <strong>{receiptTitle}</strong>:
        </p>
        
        <div className="bg-secondary-soft rounded-lg p-4 border-2 border-dashed border-border">
          <div className="flex items-center justify-between">
            <code className="text-2xl font-bold text-text-primary tracking-wider">
              {inviteCode}
            </code>
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-lg bg-primary text-text-inverse text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>

        <p className="text-xs text-text-muted">
          Este código também está disponível na página do recibo.
        </p>
      </div>
    </Modal>
  );
}

