'use client';

import { useState } from 'react';
import { ReceiptItem, Participant } from '@/types';
import { AlertModal } from './Modal';

interface ProductFormProps {
  onAdd: (item: ReceiptItem, participant: Participant) => void;
  onClose: () => void;
}

export function ProductForm({ onAdd, onClose }: ProductFormProps) {
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: 'info' | 'success' | 'warning' | 'error';
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'warning',
  });

  const handleSubmit = () => {
    if (!productName.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Validação',
        message: 'Por favor, informe o nome do produto',
        variant: 'warning',
      });
      return;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      setAlertModal({
        isOpen: true,
        title: 'Validação',
        message: 'Por favor, informe uma quantidade válida',
        variant: 'warning',
      });
      return;
    }
    if (!price || parseFloat(price.replace(',', '.')) <= 0) {
      setAlertModal({
        isOpen: true,
        title: 'Validação',
        message: 'Por favor, informe um preço válido',
        variant: 'warning',
      });
      return;
    }

    // Participante padrão temporário (será substituído por conta logada futuramente)
    const participant: Participant = {
      id: 'default-user',
      name: 'Usuário',
    };

    const item: ReceiptItem = {
      id: crypto.randomUUID(),
      name: productName.trim(),
      quantity: parseFloat(quantity),
      price: parseFloat(price.replace(',', '.')),
      participantId: participant.id,
      addedAt: new Date().toISOString(),
    };

    onAdd(item, participant);
    setProductName('');
    setQuantity('1');
    setPrice('');
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-end bg-black/50 sm:items-center sm:justify-center" style={{ zIndex: 9998 }}>
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4 text-black dark:text-zinc-50">
          Adicionar Produto
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
              Nome do Produto *
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Ex: Refrigerante"
              autoFocus
              className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
                Quantidade *
              </label>
              <input
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value.replace(/[^0-9,.]/g, ''))}
                placeholder="1"
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
                Preço (R$) *
              </label>
              <input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9,.]/g, ''))}
                placeholder="Ex: 5,50"
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-3 rounded-lg bg-black dark:bg-white text-white dark:text-black font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Adicionar
          </button>
        </div>
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
      />
    </div>
  );
}

