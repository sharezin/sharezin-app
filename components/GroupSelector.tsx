'use client';

import { useState } from 'react';
import { Group, Participant } from '@/types';
import { useGroups } from '@/hooks/useGroups';

interface GroupSelectorProps {
  onSelectParticipants: (participants: Participant[]) => void;
  onClose: () => void;
}

export function GroupSelector({ onSelectParticipants, onClose }: GroupSelectorProps) {
  const { groups, getGroupParticipants } = useGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  const handleSelectGroup = () => {
    if (!selectedGroupId) return;
    
    const participants = getGroupParticipants(selectedGroupId);
    onSelectParticipants(participants);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 sm:items-center sm:justify-center">
      <div className="w-full max-w-md bg-surface rounded-t-2xl sm:rounded-2xl p-6 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4 text-text-primary">
          Selecionar Grupo
        </h2>
        
        {groups.length === 0 ? (
          <p className="text-text-secondary mb-4">
            Nenhum grupo cadastrado ainda.
          </p>
        ) : (
          <div className="space-y-2 mb-6">
            {groups.map(group => (
              <label
                key={group.id}
                className="flex items-center p-3 rounded-lg border border-border-strong cursor-pointer hover:bg-secondary-hover"
              >
                <input
                  type="radio"
                  name="group"
                  value={group.id}
                  checked={selectedGroupId === group.id}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="mr-3 w-4 h-4"
                />
                <span className="text-text-primary">{group.name}</span>
              </label>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg border border-border text-text-primary hover:bg-secondary-hover transition-colors"
          >
            Cancelar
          </button>
          {groups.length > 0 && (
            <button
              onClick={handleSelectGroup}
              disabled={!selectedGroupId}
              className="flex-1 px-4 py-3 rounded-lg bg-primary text-text-inverse font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-hover transition-colors"
            >
              Adicionar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

