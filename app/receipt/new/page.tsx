'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useReceipts } from '@/hooks/useReceipts';
import { useGroups } from '@/hooks/useGroups';
import { AlertModal } from '@/components/Modal';
import { InviteCodeModal } from '@/components/InviteCodeModal';

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
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Link
              href="/"
              className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Voltar"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-black dark:text-zinc-50">
                Novo Recibo
              </h1>
            </div>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm">
            Crie um novo recibo compartilhado
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
              Nome do Recibo *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Jantar no restaurante X"
              autoFocus
              className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
              Adicionar Grupo (Opcional)
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
            >
              <option value="">Nenhum grupo selecionado</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Selecione um grupo para adicionar seus participantes automaticamente
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
                Taxa do Garçom (%)
              </label>
              <input
                type="text"
                value={serviceChargePercent}
                onChange={(e) => setServiceChargePercent(e.target.value.replace(/[^0-9,.]/g, ''))}
                placeholder="Ex: 10"
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Opcional - Calculado sobre o total
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
                Cover (R$)
              </label>
              <input
                type="text"
                value={cover}
                onChange={(e) => setCover(e.target.value.replace(/[^0-9,.]/g, ''))}
                placeholder="Ex: 5,00"
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Opcional - Valor fixo
              </p>
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={!title.trim()}
            className="w-full px-4 py-3 rounded-lg bg-black dark:bg-white text-white dark:text-black font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Criar Recibo
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

      {newReceipt && (
        <InviteCodeModal
          isOpen={showInviteModal}
          onClose={() => {
            setShowInviteModal(false);
            router.push(`/receipt/${newReceipt.id}`);
          }}
          inviteCode={newReceipt.inviteCode}
          receiptTitle={newReceipt.title}
        />
      )}
    </div>
  );
}

