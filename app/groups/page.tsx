'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGroups } from '@/hooks/useGroups';
import { Group, Participant } from '@/types';
import { saveParticipant, deleteParticipant } from '@/lib/storage';
import { ConfirmModal, PromptModal } from '@/components/Modal';

export default function GroupsPage() {
  const router = useRouter();
  const { groups, loading, createGroup, updateGroup, removeGroup, getGroupParticipants } = useGroups();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    groupId: string | null;
  }>({
    isOpen: false,
    groupId: null,
  });
  const [promptModal, setPromptModal] = useState<{
    isOpen: boolean;
    groupId: string | null;
  }>({
    isOpen: false,
    groupId: null,
  });

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    createGroup(newGroupName.trim());
    setNewGroupName('');
    setShowCreateForm(false);
  };

  const handleDeleteGroup = (id: string) => {
    setDeleteConfirm({ isOpen: true, groupId: id });
  };

  const confirmDeleteGroup = () => {
    if (deleteConfirm.groupId) {
      removeGroup(deleteConfirm.groupId);
    }
    setDeleteConfirm({ isOpen: false, groupId: null });
  };

  const handleAddParticipantToGroup = (groupId: string) => {
    setPromptModal({ isOpen: true, groupId });
  };

  const confirmAddParticipant = (name: string) => {
    if (!promptModal.groupId || !name.trim()) return;

    const newParticipant: Participant = {
      id: crypto.randomUUID(),
      name: name.trim(),
      groupId: promptModal.groupId,
    };

    saveParticipant(newParticipant);
    const group = groups.find(g => g.id === promptModal.groupId);
    if (group) {
      updateGroup({
        ...group,
        participantIds: [...group.participantIds, newParticipant.id],
      });
    }
    setPromptModal({ isOpen: false, groupId: null });
  };

  const handleRemoveParticipantFromGroup = (groupId: string, participantId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      updateGroup({
        ...group,
        participantIds: group.participantIds.filter(id => id !== participantId),
      });
      deleteParticipant(participantId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black dark:text-zinc-50 mb-2">
            Grupos
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Gerencie grupos de participantes
          </p>
        </div>

        {showCreateForm && (
          <div className="mb-6 p-4 bg-white dark:bg-zinc-900 rounded-lg space-y-3">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateGroup();
                if (e.key === 'Escape') {
                  setShowCreateForm(false);
                  setNewGroupName('');
                }
              }}
              placeholder="Nome do grupo"
              autoFocus
              className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateGroup}
                className="flex-1 px-4 py-3 rounded-lg bg-black dark:bg-white text-white dark:text-black font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                Criar
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewGroupName('');
                }}
                className="px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {groups.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4">
              <svg
                className="mx-auto h-16 w-16 text-zinc-400 dark:text-zinc-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 text-lg">
              Nenhum grupo cadastrado
            </p>
            <p className="text-zinc-500 dark:text-zinc-500 text-sm mt-2">
              Crie grupos para reutilizar participantes em diferentes recibos
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map(group => {
              const participants = getGroupParticipants(group.id);
              const isExpanded = expandedGroupId === group.id;

              return (
                <div
                  key={group.id}
                  className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-black dark:text-zinc-50 mb-1">
                          {group.name}
                        </h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {participants.length} participante{participants.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                          className="px-3 py-1 text-sm rounded border border-zinc-300 dark:border-zinc-600 text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          {isExpanded ? 'Ocultar' : 'Ver'}
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="px-3 py-1 text-sm rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700 space-y-3">
                        <button
                          onClick={() => handleAddParticipantToGroup(group.id)}
                          className="w-full px-4 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          + Adicionar Participante
                        </button>

                        {participants.length === 0 ? (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Nenhum participante neste grupo.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {participants.map(participant => (
                              <div
                                key={participant.id}
                                className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
                              >
                                <span className="text-black dark:text-zinc-50">
                                  {participant.name}
                                </span>
                                <button
                                  onClick={() => handleRemoveParticipantFromGroup(group.id, participant.id)}
                                  className="px-3 py-1 text-sm rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  Remover
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, groupId: null })}
        onConfirm={confirmDeleteGroup}
        title="Excluir Grupo"
        message="Tem certeza que deseja excluir este grupo? Os participantes não serão removidos."
        confirmText="Excluir"
        cancelText="Cancelar"
        confirmVariant="danger"
      />

      <PromptModal
        isOpen={promptModal.isOpen}
        onClose={() => setPromptModal({ isOpen: false, groupId: null })}
        onConfirm={confirmAddParticipant}
        title="Adicionar Participante"
        message="Informe o nome do participante:"
        placeholder="Nome do participante"
        confirmText="Adicionar"
        cancelText="Cancelar"
      />

      {/* Floating Action Button */}
      <button
        onClick={() => setShowCreateForm(true)}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-black dark:bg-white text-white dark:text-black font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-lg hover:shadow-xl flex items-center justify-center z-[60]"
        aria-label="Criar novo grupo"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
    </div>
  );
}

