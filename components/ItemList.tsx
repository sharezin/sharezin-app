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
    
    const price = parseFloat(newItemValue.replace(',', '.'));
    if (isNaN(price) || price <= 0) return;
    
    const newItem: ReceiptItem = {
      id: crypto.randomUUID(),
      name: newItemDescription.trim(),
      quantity: 1,
      price,
      participantId: participants[0]?.id || '',
      addedAt: new Date().toISOString(),
    };
    
    onAdd(newItem);
    setNewItemDescription('');
    setNewItemValue('');
    setShowAddForm(false);
  };

  const handleUpdateParticipant = (itemId: string, participantId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    const updatedItem: ReceiptItem = {
      ...item,
      participantId,
    };
    
    onUpdate(itemId, updatedItem);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary">
          Itens ({items.length})
        </h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 text-sm rounded-lg bg-primary text-text-inverse font-medium hover:bg-primary-hover transition-colors"
        >
          + Adicionar Item
        </button>
      </div>

      {showAddForm && (
        <div className="p-4 bg-secondary-soft rounded-lg space-y-3">
          <input
            type="text"
            value={newItemDescription}
            onChange={(e) => setNewItemDescription(e.target.value)}
            placeholder="Descrição do item"
            className="w-full px-3 py-2 rounded border border-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={newItemValue}
              onChange={(e) => setNewItemValue(e.target.value.replace(/[^0-9,.]/g, ''))}
              placeholder="Valor (ex: 25,50)"
              className="flex-1 px-3 py-2 rounded border border-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleAddItem}
              className="px-4 py-2 rounded bg-primary text-text-inverse font-medium hover:bg-primary-hover transition-colors"
            >
              OK
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewItemDescription('');
                setNewItemValue('');
              }}
              className="px-4 py-2 rounded border border-border text-text-primary hover:bg-secondary-hover transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-text-muted text-sm">
          Nenhum item adicionado ainda.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div
              key={item.id}
              className="p-4 bg-secondary-soft rounded-lg space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-text-primary">
                    {item.name}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {item.quantity}x {item.price.toFixed(2).replace('.', ',')} = R$ {(item.quantity * item.price).toFixed(2).replace('.', ',')}
                  </p>
                  {participants.find(p => p.id === item.participantId) && (
                    <p className="text-xs text-text-muted mt-1">
                      Adicionado por: {participants.find(p => p.id === item.participantId)?.name}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingItemId(editingItemId === item.id ? null : item.id)}
                    className="px-3 py-1 text-sm rounded border border-border text-text-primary hover:bg-secondary-hover transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="px-3 py-1 text-sm rounded text-error hover:bg-error/10 transition-colors"
                  >
                    Remover
                  </button>
                </div>
              </div>

              {editingItemId === item.id && (
                <div className="pt-2 space-y-2 border-t border-border-strong">
                  <p className="text-sm font-medium text-text-primary">
                    Quem adicionou este item?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {participants.map(participant => (
                      <button
                        key={participant.id}
                        onClick={() => {
                          handleUpdateParticipant(item.id, participant.id);
                          setEditingItemId(null);
                        }}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          item.participantId === participant.id
                            ? 'bg-primary text-text-inverse'
                            : 'border border-border text-text-primary hover:bg-secondary-hover'
                        }`}
                      >
                        {participant.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

