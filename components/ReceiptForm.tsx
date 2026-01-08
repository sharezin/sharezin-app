'use client';

import { useState, useEffect, useCallback } from 'react';
import { Receipt, Participant, ReceiptItem } from '@/types';
import { ParticipantList } from './ParticipantList';
import { ItemList } from './ItemList';
import { SummaryCard } from './SummaryCard';

interface ReceiptFormProps {
  receipt: Receipt;
  onSave: (receipt: Receipt) => void;
  onCancel?: () => void;
}

export function ReceiptForm({ receipt, onSave, onCancel }: ReceiptFormProps) {
  const [title, setTitle] = useState(receipt.title);
  const [serviceCharge, setServiceCharge] = useState(receipt.serviceChargePercent.toString());
  const [cover, setCover] = useState(receipt.cover.toString());
  const [participants, setParticipants] = useState<Participant[]>(receipt.participants);
  const [items, setItems] = useState<ReceiptItem[]>(receipt.items);

  const handleSave = useCallback(() => {
    const updatedReceipt: Receipt = {
      ...receipt,
      title,
      participants,
      items,
      serviceChargePercent: parseFloat(serviceCharge.replace(',', '.')) || 0,
      cover: parseFloat(cover.replace(',', '.')) || 0,
    };
    onSave(updatedReceipt);
  }, [receipt, title, participants, items, serviceCharge, cover, onSave]);

  useEffect(() => {
    handleSave();
  }, [handleSave]);

  const handleAddParticipant = (participant: Participant) => {
    // Verifica se já existe
    if (!participants.find(p => p.id === participant.id)) {
      setParticipants([...participants, participant]);
    }
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id));
    // Remove os itens do participante também
    setItems(items.filter(item => item.participantId !== id));
  };

  const handleAddItem = (item: ReceiptItem) => {
    setItems([...items, item]);
  };

  const handleUpdateItem = (id: string, updatedItem: ReceiptItem) => {
    setItems(items.map(item => item.id === id ? updatedItem : item));
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  return (
    <div className="space-y-6 pb-6">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Título do Recibo
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Ex: Jantar no restaurante X"
        />
      </div>

      <ParticipantList
        participants={participants}
        onAdd={handleAddParticipant}
        onRemove={handleRemoveParticipant}
      />

      <ItemList
        items={items}
        participants={participants}
        onAdd={handleAddItem}
        onUpdate={handleUpdateItem}
        onRemove={handleRemoveItem}
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Taxa do Garçom
          </label>
          <input
            type="text"
            value={serviceCharge}
            onChange={(e) => setServiceCharge(e.target.value.replace(/[^0-9,.]/g, ''))}
            placeholder="0,00"
            className="w-full px-4 py-3 rounded-lg border border-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Cover
          </label>
          <input
            type="text"
            value={cover}
            onChange={(e) => setCover(e.target.value.replace(/[^0-9,.]/g, ''))}
            placeholder="0,00"
            className="w-full px-4 py-3 rounded-lg border border-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {participants.length > 0 && (
        <SummaryCard receipt={{
          ...receipt,
          title,
          participants,
          items,
          serviceChargePercent: parseFloat(serviceCharge.replace(',', '.')) || 0,
          cover: parseFloat(cover.replace(',', '.')) || 0,
        }} />
      )}

      {onCancel && (
        <button
          onClick={onCancel}
          className="w-full px-4 py-3 rounded-lg border border-border text-text-primary hover:bg-secondary-hover transition-colors"
        >
          Cancelar
        </button>
      )}
    </div>
  );
}

