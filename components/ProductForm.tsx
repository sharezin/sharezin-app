'use client';

import { useState } from 'react';
import { ReceiptItem, Participant } from '@/types';
import { AlertModal } from './Modal';
import { Input } from '@/components/ui/Input';
import { NumberInput } from '@/components/forms/NumberInput';
import { CurrencyInput } from '@/components/forms/CurrencyInput';
import { Button } from '@/components/ui/Button';

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
          <Input
            label="Nome do Produto *"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Ex: Refrigerante"
            autoFocus
          />

          <div className="grid grid-cols-2 gap-4">
            <NumberInput
              label="Quantidade *"
              value={quantity}
              onChange={setQuantity}
              placeholder="1"
              allowDecimals={false}
            />
            <CurrencyInput
              label="Preço (R$) *"
              value={price}
              onChange={setPrice}
              placeholder="Ex: 5,50"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={onClose}
            disabled={loading}
            variant="secondary"
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            loading={loading}
            variant="primary"
            className="flex-1"
          >
            Adicionar
          </Button>
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

