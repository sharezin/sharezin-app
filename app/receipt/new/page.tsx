'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useReceipts } from '@/hooks/useReceipts';
import { useGroups } from '@/hooks/useGroups';
import { AlertModal } from '@/components/Modal';
import { Input } from '@/components/ui/Input';
import { NumberInput } from '@/components/forms/NumberInput';
import { CurrencyInput } from '@/components/forms/CurrencyInput';
import { Button } from '@/components/ui/Button';
import { BackButton } from '@/components/ui/BackButton';
import dynamic from 'next/dynamic';

const DynamicInviteCodeModal = dynamic(() => import('@/components/InviteCodeModal').then(mod => ({ default: mod.InviteCodeModal })), {
  ssr: false,
});

export default function NewReceiptPage() {
  const router = useRouter();
  const { createReceipt, updateReceipt } = useReceipts();
  const { groups } = useGroups();
  const [title, setTitle] = useState('');
  const [serviceChargePercent, setServiceChargePercent] = useState('');
  const [cover, setCover] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
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
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newReceipt, setNewReceipt] = useState<{ id: string; title: string; inviteCode: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Validação',
        message: 'Por favor, informe o nome do recibo',
        variant: 'warning',
      });
      return;
    }

    setIsCreating(true);

    try {
      const newReceipt = await createReceipt(
        title.trim(),
        serviceChargePercent ? parseFloat(serviceChargePercent.replace(',', '.')) : 0,
        cover ? parseFloat(cover.replace(',', '.')) : 0,
        selectedGroupId || undefined
      );

      setNewReceipt({
        id: newReceipt.id,
        title: newReceipt.title,
        inviteCode: newReceipt.inviteCode,
      });
      
      setShowInviteModal(true);
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao criar recibo. Tente novamente.',
        variant: 'error',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <BackButton />
            <div className="flex-1">
              <h1 className="text-xl font-bold text-text-primary">
                Novo Recibo
              </h1>
            </div>
          </div>
          <p className="text-text-secondary text-sm">
            Crie um novo recibo compartilhado
          </p>
        </div>

        <div className="bg-surface rounded-lg p-6 space-y-6">
          <Input
            label="Nome do Recibo *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Jantar no restaurante X"
            autoFocus
          />

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Adicionar Grupo (Opcional)
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Nenhum grupo selecionado</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-muted mt-1">
              Selecione um grupo para adicionar seus participantes automaticamente
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <NumberInput
              label="Taxa do Garçom (%)"
              value={serviceChargePercent}
              onChange={setServiceChargePercent}
              placeholder="Ex: 10"
              allowDecimals={true}
            />
            <CurrencyInput
              label="Cover (R$)"
              value={cover}
              onChange={setCover}
              placeholder="Ex: 5,00"
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={!title.trim() || isCreating}
            loading={isCreating}
            variant="primary"
            className="w-full"
          >
            Criar Recibo
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

      {newReceipt && (
        <DynamicInviteCodeModal
          isOpen={showInviteModal}
          onClose={() => {
            setShowInviteModal(false);
            router.replace(`/receipt/${newReceipt.id}`);
          }}
          inviteCode={newReceipt.inviteCode}
          receiptTitle={newReceipt.title}
        />
      )}
    </div>
  );
}

