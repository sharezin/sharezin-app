'use client';

import { Receipt, ReceiptItem } from '@/types';
import { formatCurrency, calculateItemTotal, calculateItemsTotal, calculateServiceChargeAmount } from '@/lib/calculations';
import { jsPDF } from 'jspdf';

interface ParticipantReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: Receipt;
  participantId: string;
  participantName: string;
}

export function ParticipantReceiptModal({
  isOpen,
  onClose,
  receipt,
  participantId,
  participantName,
}: ParticipantReceiptModalProps) {
  if (!isOpen) return null;

  // Filtrar itens do participante
  const participantItems = receipt.items.filter(item => item.participantId === participantId);
  
  // Calcular totais
  const participantItemsTotal = participantItems.reduce(
    (sum, item) => sum + calculateItemTotal(item),
    0
  );
  
  const itemsTotal = calculateItemsTotal(receipt);
  const serviceChargeAmount = calculateServiceChargeAmount(receipt);
  const participantServiceCharge = itemsTotal > 0 
    ? (participantItemsTotal / itemsTotal) * serviceChargeAmount 
    : 0;
  
  const numberOfParticipants = receipt.participants.length;
  const coverPerPerson = numberOfParticipants > 0 ? receipt.cover / numberOfParticipants : 0;
  
  const participantTotal = participantItemsTotal + participantServiceCharge + coverPerPerson;

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = margin;

    // Função para adicionar texto com quebra de linha
    const addText = (text: string, x: number, y: number, options?: { fontSize?: number; fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic'; align?: 'left' | 'center' | 'right' }) => {
      doc.setFontSize(options?.fontSize || 10);
      if (options?.fontStyle) {
        doc.setFont('helvetica', options.fontStyle);
      } else {
        doc.setFont('helvetica', 'normal');
      }
      doc.text(text, x, y, { align: options?.align || 'left' });
    };

    // Header
    doc.setFillColor(39, 39, 42); // zinc-800
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    addText('Recibo do Participante', pageWidth / 2, 20, { fontSize: 18, fontStyle: 'bold', align: 'center' });
    addText(receipt.title, pageWidth / 2, 30, { fontSize: 12, align: 'center' });
    
    yPosition = 50;
    doc.setTextColor(0, 0, 0);

    // Informações do participante e data
    addText(`Participante: ${participantName}`, margin, yPosition);
    yPosition += 8;
    addText(`Data: ${new Date(receipt.date).toLocaleDateString('pt-BR')}`, margin, yPosition);
    yPosition += 15;

    // Linha separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Itens
    if (participantItems.length === 0) {
      addText('Nenhum item adicionado', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
    } else {
      participantItems.forEach((item) => {
        // Verifica se precisa de nova página
        if (yPosition > 250) {
          doc.addPage();
          yPosition = margin;
        }

        const itemTotal = calculateItemTotal(item);
        const itemName = item.name.length > 30 ? item.name.substring(0, 27) + '...' : item.name;
        
        addText(itemName, margin, yPosition);
        addText(`${item.quantity}x ${formatCurrency(item.price)}`, margin, yPosition + 5, { fontSize: 9 });
        addText(formatCurrency(itemTotal), pageWidth - margin, yPosition, { align: 'right', fontStyle: 'bold' });
        
        yPosition += 15;
      });
    }

    yPosition += 5;
    
    // Linha separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Subtotal
    if (participantItemsTotal > 0) {
      addText('Subtotal (itens):', margin, yPosition);
      addText(formatCurrency(participantItemsTotal), pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 8;
    }

    // Taxa do garçom
    if (participantServiceCharge > 0) {
      addText(`Taxa do garçom (${receipt.serviceChargePercent}%):`, margin, yPosition);
      addText(formatCurrency(participantServiceCharge), pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 8;
    }

    // Cover
    if (coverPerPerson > 0) {
      addText('Cover:', margin, yPosition);
      addText(formatCurrency(coverPerPerson), pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 8;
    }

    yPosition += 5;
    
    // Linha separadora
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Total
    addText('Total', margin, yPosition, { fontSize: 14, fontStyle: 'bold' });
    addText(formatCurrency(participantTotal), pageWidth - margin, yPosition, { fontSize: 16, fontStyle: 'bold', align: 'right' });

    // Rodapé
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    addText('Gerado pelo Sharezin', pageWidth / 2, footerY, { align: 'center' });

    // Salvar PDF
    const fileName = `recibo-${receipt.title.replace(/\s+/g, '-').toLowerCase()}-${participantName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
    doc.save(fileName);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-zinc-900 dark:bg-black rounded-lg p-6 mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-800 rounded-lg">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Recibo do Participante</h2>
              <p className="text-sm text-zinc-400">Recibo: {receipt.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
            aria-label="Fechar"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Receipt Number and Date */}
        <div className="mb-4 pb-4 border-b border-zinc-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Participante:</span>
            <span className="text-white font-medium">{participantName}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-zinc-400">Data:</span>
            <span className="text-zinc-300">
              {new Date(receipt.date).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>

        {/* Items List */}
        <div className="mb-4 pb-4 border-b border-zinc-700">
          {participantItems.length === 0 ? (
            <p className="text-zinc-400 text-sm text-center py-4">
              Nenhum item adicionado
            </p>
          ) : (
            <div className="space-y-3">
              {participantItems.map((item) => {
                const itemTotal = calculateItemTotal(item);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <p className="text-white font-medium">{item.name}</p>
                      <p className="text-zinc-400 text-sm">
                        {item.quantity}x {formatCurrency(item.price)}
                      </p>
                    </div>
                    <p className="text-white font-semibold">
                      {formatCurrency(itemTotal)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Subtotal */}
        {participantItemsTotal > 0 && (
          <div className="mb-2 pb-2 border-b border-zinc-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Subtotal (itens):</span>
              <span className="text-zinc-300">{formatCurrency(participantItemsTotal)}</span>
            </div>
          </div>
        )}

        {/* Service Charge */}
        {participantServiceCharge > 0 && (
          <div className="mb-2 pb-2 border-b border-zinc-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">
                Taxa do garçom ({receipt.serviceChargePercent}%):
              </span>
              <span className="text-zinc-300">{formatCurrency(participantServiceCharge)}</span>
            </div>
          </div>
        )}

        {/* Cover */}
        {coverPerPerson > 0 && (
          <div className="mb-4 pb-4 border-b border-zinc-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Cover:</span>
              <span className="text-zinc-300">{formatCurrency(coverPerPerson)}</span>
            </div>
          </div>
        )}

        {/* Total */}
        <div className="flex items-center justify-between pt-4">
          <span className="text-lg font-bold text-white">Total</span>
          <span className="text-2xl font-bold text-white">
            {formatCurrency(participantTotal)}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={generatePDF}
            className="flex-1 px-4 py-3 rounded-lg bg-zinc-800 dark:bg-zinc-700 text-white font-medium hover:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors flex items-center justify-center gap-2"
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
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Baixar PDF
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-white font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
