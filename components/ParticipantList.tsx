'use client';

import { useState } from 'react';
import { Participant } from '@/types';
import { GroupSelector } from './GroupSelector';
import { useGroups } from '@/hooks/useGroups';

interface ParticipantListProps {
  participants: Participant[];
  onAdd: (participant: Participant) => void;
  onRemove: (id: string) => void;
}

export function ParticipantList({ participants, onAdd, onRemove }: ParticipantListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState('');
  const { groups } = useGroups();

  const handleAddParticipant = () => {
    if (!newParticipantName.trim()) return;
    
    const newParticipant: Participant = {
      id: crypto.randomUUID(),
      name: newParticipantName.trim(),
    };
    
    onAdd(newParticipant);
    setNewParticipantName('');
    setShowAddForm(false);
  };

  const handleAddFromGroup = (groupParticipants: Participant[]) => {
    groupParticipants.forEach(p => onAdd(p));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
          Participantes ({participants.length})
        </h3>
        <div className="flex gap-2">
          {groups.length > 0 && (
            <button
              onClick={() => setShowGroupSelector(true)}
              className="px-4 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Do Grupo
            </button>
          )}
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 text-sm rounded-lg bg-black dark:bg-white text-white dark:text-black font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            + Adicionar
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="flex gap-2 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
          <input
            type="text"
            value={newParticipantName}
            onChange={(e) => setNewParticipantName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddParticipant();
              if (e.key === 'Escape') setShowAddForm(false);
            }}
            placeholder="Nome do participante"
            autoFocus
            className="flex-1 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
          />
          <button
            onClick={handleAddParticipant}
            className="px-4 py-2 rounded bg-black dark:bg-white text-white dark:text-black font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            OK
          </button>
          <button
            onClick={() => {
              setShowAddForm(false);
              setNewParticipantName('');
            }}
            className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-600 text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}

      {participants.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          Nenhum participante adicionado ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {participants.map(participant => (
            <div
              key={participant.id}
              className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg"
            >
              <span className="text-black dark:text-zinc-50">{participant.name}</span>
              <button
                onClick={() => onRemove(participant.id)}
                className="px-3 py-1 text-sm rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}

      {showGroupSelector && (
        <GroupSelector
          onSelectParticipants={handleAddFromGroup}
          onClose={() => setShowGroupSelector(false)}
        />
      )}
    </div>
  );
}

