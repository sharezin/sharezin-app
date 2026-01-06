'use client';

import { useState } from 'react';
import { ReceiptItem, Participant } from '@/types';
import { AlertModal } from './Modal';

interface ProductFormProps {
  onAdd: (item: ReceiptItem, participant: Participant) => Promise<void>;
  onClose: () => void;
  currentUserId?: string;
  currentUserName?: string;
}

export function ProductForm({ onAdd, onClose, currentUserId, currentUserName }: ProductFormProps) {
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async () => {
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

    setLoading(true);

    try {
      // Usa o usuário autenticado ou cria um participante temporário
      const participant: Participant = {
        id: currentUserId || crypto.randomUUID(),
        name: currentUserName || 'Usuário',
      };

      const item: ReceiptItem = {
        id: crypto.randomUUID(),
        name: productName.trim(),
        quantity: parseFloat(quantity),
        price: parseFloat(price.replace(',', '.')),
        participantId: participant.id,
        addedAt: new Date().toISOString(),
      };

      await onAdd(item, participant);
      
      // Só fecha o modal e limpa os campos se for sucesso
      setProductName('');
      setQuantity('1');
      setPrice('');
      onClose();
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao adicionar produto. Tente novamente.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
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
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-lg bg-black dark:bg-white text-white dark:text-black font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adicionando...
              </>
            ) : (
              'Adicionar'
            )}
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

