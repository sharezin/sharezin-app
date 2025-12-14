import { Receipt, ReceiptItem, Participant } from '@/types';

/**
 * Calcula o valor total de um item (quantidade * preço)
 */
export function calculateItemTotal(item: ReceiptItem): number {
  return item.quantity * item.price;
}

/**
 * Calcula o total dos itens do recibo (antes de taxas)
 */
export function calculateItemsTotal(receipt: Receipt): number {
  return receipt.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
}

/**
 * Calcula o valor da taxa do garçom
 */
export function calculateServiceChargeAmount(receipt: Receipt): number {
  const itemsTotal = calculateItemsTotal(receipt);
  return itemsTotal * (receipt.serviceChargePercent / 100);
}

/**
 * Calcula o total do recibo (itens + taxa do garçom + cover)
 */
export function calculateReceiptTotal(receipt: Receipt): number {
  const itemsTotal = calculateItemsTotal(receipt);
  const serviceChargeAmount = calculateServiceChargeAmount(receipt);
  return itemsTotal + serviceChargeAmount + receipt.cover;
}

/**
 * Calcula o total que cada participante deve pagar
 */
export function calculateParticipantTotals(receipt: Receipt): Record<string, number> {
  const totals: Record<string, number> = {};
  
  // Inicializa totais
  receipt.participants.forEach(p => {
    totals[p.id] = 0;
  });
  
  // Soma os valores dos itens de cada participante
  receipt.items.forEach(item => {
    const itemTotal = calculateItemTotal(item);
    if (totals[item.participantId] !== undefined) {
      totals[item.participantId] += itemTotal;
    }
  });
  
  // Adiciona taxa do garçom e cover (divididos proporcionalmente e igualmente respectivamente)
  const itemsTotal = calculateItemsTotal(receipt);
  const serviceChargeAmount = itemsTotal * (receipt.serviceChargePercent / 100);
  const numberOfParticipants = receipt.participants.length;
  
  if (numberOfParticipants > 0 && itemsTotal > 0) {
    // Taxa do garçom dividida proporcionalmente ao consumo de cada um
    receipt.participants.forEach(p => {
      const participantItemsTotal = receipt.items
        .filter(item => item.participantId === p.id)
        .reduce((sum, item) => sum + calculateItemTotal(item), 0);
      
      const participantServiceCharge = (participantItemsTotal / itemsTotal) * serviceChargeAmount;
      totals[p.id] += participantServiceCharge;
    });
    
    // Cover dividido igualmente entre todos
    const coverPerPerson = receipt.cover / numberOfParticipants;
    receipt.participants.forEach(p => {
      totals[p.id] += coverPerPerson;
    });
  }
  
  return totals;
}

/**
 * Arredonda um valor para 2 casas decimais
 */
export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Formata um valor monetário
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
