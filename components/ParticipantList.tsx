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
        <h3 className="text-lg font-semibold text-text-primary">
          Participantes ({participants.length})
        </h3>
        <div className="flex gap-2">
          {groups.length > 0 && (
            <button
              onClick={() => setShowGroupSelector(true)}
              className="px-4 py-2 text-sm rounded-lg border border-border text-text-primary hover:bg-secondary-hover transition-colors"
            >
              Do Grupo
            </button>
          )}
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-text-inverse font-medium hover:bg-primary-hover transition-colors"
          >
            + Adicionar
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="flex gap-2 p-3 bg-secondary-soft rounded-lg">
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
            className="flex-1 px-3 py-2 rounded border border-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleAddParticipant}
            className="px-4 py-2 rounded bg-primary text-text-inverse font-medium hover:bg-primary-hover transition-colors"
          >
            OK
          </button>
          <button
            onClick={() => {
              setShowAddForm(false);
              setNewParticipantName('');
            }}
            className="px-4 py-2 rounded border border-border text-text-primary hover:bg-secondary-hover transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}

      {participants.length === 0 ? (
        <p className="text-text-muted text-sm">
          Nenhum participante adicionado ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {participants.map(participant => (
            <div
              key={participant.id}
              className="flex items-center justify-between p-3 bg-secondary-soft rounded-lg"
            >
              <span className="text-text-primary">{participant.name}</span>
              <button
                onClick={() => onRemove(participant.id)}
                className="px-3 py-1 text-sm rounded text-error hover:bg-error/10 transition-colors"
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

