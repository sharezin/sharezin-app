'use client';

import { useState } from 'react';
import { ReceiptItem, Participant } from '@/types';

interface ItemListProps {
  items: ReceiptItem[];
  participants: Participant[];
  onAdd: (item: ReceiptItem) => void;
  onUpdate: (id: string, item: ReceiptItem) => void;
  onRemove: (id: string) => void;
}

export function ItemList({ items, participants, onAdd, onUpdate, onRemove }: ItemListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemValue, setNewItemValue] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const handleAddItem = () => {
    if (!newItemDescription.trim() || !newItemValue) return;
    
    const value = parseFloat(newItemValue.replace(',', '.'));
    if (isNaN(value) || value <= 0) return;
    
    const newItem: ReceiptItem = {
      id: crypto.randomUUID(),
      description: newItemDescription.trim(),
      value,
      participantIds: [],
      divisionType: 'equal',
    };
    
    onAdd(newItem);
    setNewItemDescription('');
    setNewItemValue('');
    setShowAddForm(false);
  };

  const handleUpdateDivision = (itemId: string, divisionType: 'equal' | 'proportional', selectedParticipantIds: string[]) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    const updatedItem: ReceiptItem = {
      ...item,
      divisionType,
      participantIds: divisionType === 'proportional' ? selectedParticipantIds : [],
    };
    
    onUpdate(itemId, updatedItem);
  };

  const toggleParticipantSelection = (itemId: string, participantId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    const currentIds = item.participantIds || [];
    const newIds = currentIds.includes(participantId)
      ? currentIds.filter(id => id !== participantId)
      : [...currentIds, participantId];
    
    handleUpdateDivision(itemId, 'proportional', newIds);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
          Itens ({items.length})
        </h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 text-sm rounded-lg bg-black dark:bg-white text-white dark:text-black font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          + Adicionar Item
        </button>
      </div>

      {showAddForm && (
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg space-y-3">
          <input
            type="text"
            value={newItemDescription}
            onChange={(e) => setNewItemDescription(e.target.value)}
            placeholder="Descrição do item"
            className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={newItemValue}
              onChange={(e) => setNewItemValue(e.target.value.replace(/[^0-9,.]/g, ''))}
              placeholder="Valor (ex: 25,50)"
              className="flex-1 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
            />
            <button
              onClick={handleAddItem}
              className="px-4 py-2 rounded bg-black dark:bg-white text-white dark:text-black font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              OK
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewItemDescription('');
                setNewItemValue('');
              }}
              className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-600 text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          Nenhum item adicionado ainda.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div
              key={item.id}
              className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-black dark:text-zinc-50">
                    {item.description}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    R$ {item.value.toFixed(2).replace('.', ',')}
                  </p>
                </div>
                <button
                  onClick={() => onRemove(item.id)}
                  className="px-3 py-1 text-sm rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Remover
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateDivision(item.id, 'equal', [])}
                    className={`flex-1 px-3 py-2 text-sm rounded ${
                      item.divisionType === 'equal'
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'border border-zinc-300 dark:border-zinc-600 text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    } transition-colors`}
                  >
                    Dividir Igual
                  </button>
                  <button
                    onClick={() => {
                      if (item.divisionType !== 'proportional') {
                        handleUpdateDivision(item.id, 'proportional', participants.map(p => p.id));
                      }
                      setEditingItemId(editingItemId === item.id ? null : item.id);
                    }}
                    className={`flex-1 px-3 py-2 text-sm rounded ${
                      item.divisionType === 'proportional'
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'border border-zinc-300 dark:border-zinc-600 text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    } transition-colors`}
                  >
                    Dividir Proporcional
                  </button>
                </div>

                {item.divisionType === 'proportional' && editingItemId === item.id && (
                  <div className="pt-2 space-y-2 border-t border-zinc-200 dark:border-zinc-700">
                    <p className="text-sm font-medium text-black dark:text-zinc-50">
                      Quem consumiu este item?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {participants.map(participant => (
                        <button
                          key={participant.id}
                          onClick={() => toggleParticipantSelection(item.id, participant.id)}
                          className={`px-3 py-1 text-sm rounded transition-colors ${
                            item.participantIds.includes(participant.id)
                              ? 'bg-black dark:bg-white text-white dark:text-black'
                              : 'border border-zinc-300 dark:border-zinc-600 text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          {participant.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

