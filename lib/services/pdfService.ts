import { Receipt } from '@/types';
import { formatCurrency, calculateItemTotal, calculateItemsTotal, calculateServiceChargeAmount } from '@/lib/calculations';

/**
 * Gera PDF do recibo usando jsPDF
 * Importa a biblioteca dinamicamente para lazy loading
 */
export async function generateReceiptPDF(receipt: Receipt): Promise<void> {
  // Importação dinâmica do jsPDF
  const { jsPDF } = await import('jspdf');
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = margin;

  // Função para adicionar texto
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
  addText('Recibo', pageWidth / 2, 20, { fontSize: 18, fontStyle: 'bold', align: 'center' });
  addText(receipt.title, pageWidth / 2, 30, { fontSize: 12, align: 'center' });
  
  yPosition = 50;
  doc.setTextColor(0, 0, 0);

  // Informações do recibo
  addText(`Data: ${new Date(receipt.date).toLocaleDateString('pt-BR')}`, margin, yPosition);
  yPosition += 8;
  addText(`Código: ${receipt.inviteCode}`, margin, yPosition);
  yPosition += 15;

  // Linha separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Itens
  const sortedItems = [...receipt.items].sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
  );

  if (sortedItems.length === 0) {
    addText('Nenhum item adicionado', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
  } else {
    sortedItems.forEach((item) => {
      // Verifica se precisa de nova página
      if (yPosition > 250) {
        doc.addPage();
        yPosition = margin;
      }

      const itemTotal = calculateItemTotal(item);
      const participant = receipt.participants.find(p => p.id === item.participantId);
      const participantName = participant?.name || 'Desconhecido';
      const itemName = item.name.length > 25 ? item.name.substring(0, 22) + '...' : item.name;
      
      addText(itemName, margin, yPosition);
      addText(`${item.quantity}x ${formatCurrency(item.price)} - ${participantName}`, margin, yPosition + 5, { fontSize: 9 });
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
  const itemsTotal = calculateItemsTotal(receipt);
  if (itemsTotal > 0) {
    addText('Subtotal (itens):', margin, yPosition);
    addText(formatCurrency(itemsTotal), pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 8;
  }

  // Taxa do garçom
  const serviceChargeAmount = calculateServiceChargeAmount(receipt);
  if (serviceChargeAmount > 0) {
    addText(`Taxa do garçom (${receipt.serviceChargePercent}%):`, margin, yPosition);
    addText(formatCurrency(serviceChargeAmount), pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 8;
  }

  // Cover
  if (receipt.cover > 0) {
    addText('Cover:', margin, yPosition);
    addText(formatCurrency(receipt.cover), pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 8;
  }

  yPosition += 5;
  
  // Linha separadora
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Total
  const receiptTotal = itemsTotal + serviceChargeAmount + receipt.cover;
  addText('Total', margin, yPosition, { fontSize: 14, fontStyle: 'bold' });
  addText(formatCurrency(receiptTotal), pageWidth - margin, yPosition, { fontSize: 16, fontStyle: 'bold', align: 'right' });

  yPosition += 15;

  // Resumo por participante
  if (receipt.participants.length > 0) {
    // Verifica se precisa de nova página
    if (yPosition > 220) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    addText('Resumo por Participante', margin, yPosition, { fontSize: 12, fontStyle: 'bold' });
    yPosition += 10;

    // Calcular totais por participante
    const participantTotals: Record<string, number> = {};
    receipt.participants.forEach(p => {
      participantTotals[p.id] = 0;
    });

    receipt.items.forEach(item => {
      const itemTotal = calculateItemTotal(item);
      if (participantTotals[item.participantId] !== undefined) {
        participantTotals[item.participantId] += itemTotal;
      }
    });

    const numberOfParticipants = receipt.participants.length;
    if (numberOfParticipants > 0 && itemsTotal > 0) {
      receipt.participants.forEach(p => {
        const participantItemsTotal = receipt.items
          .filter(item => item.participantId === p.id)
          .reduce((sum, item) => sum + calculateItemTotal(item), 0);
        
        const participantServiceCharge = (participantItemsTotal / itemsTotal) * serviceChargeAmount;
        participantTotals[p.id] += participantServiceCharge;
        
        const coverPerPerson = receipt.cover / numberOfParticipants;
        participantTotals[p.id] += coverPerPerson;
      });
    }

    receipt.participants
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .forEach((participant) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = margin;
        }

        const total = participantTotals[participant.id] || 0;
        addText(participant.name || 'Sem nome', margin, yPosition);
        addText(formatCurrency(total), pageWidth - margin, yPosition, { align: 'right', fontStyle: 'bold' });
        yPosition += 10;
      });
  }

  // Rodapé
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  addText('Gerado pelo Sharezin', pageWidth / 2, footerY, { align: 'center' });

  // Salvar PDF
  const fileName = `recibo-${receipt.title.replace(/\s+/g, '-').toLowerCase()}.pdf`;
  doc.save(fileName);
}
