'use client';

import { Receipt, ReceiptItem } from '@/types';
import { formatCurrency, calculateItemTotal, calculateItemsTotal, calculateServiceChargeAmount, roundToTwoDecimals } from '@/lib/calculations';

interface UserReceiptSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: Receipt;
  userId: string;
  userName: string;
}

export function UserReceiptSummaryModal({
  isOpen,
  onClose,
  receipt,
  userId,
  userName,
}: UserReceiptSummaryModalProps) {
  if (!isOpen) return null;

  // Filtrar itens do usuário
  const userItems = receipt.items.filter(item => item.participantId === userId);
  
  // Calcular totais
  const userItemsTotal = roundToTwoDecimals(userItems.reduce(
    (sum, item) => sum + calculateItemTotal(item),
    0
  ));
  
  const itemsTotal = calculateItemsTotal(receipt);
  const serviceChargeAmount = calculateServiceChargeAmount(receipt);
  const userServiceCharge = roundToTwoDecimals(itemsTotal > 0 
    ? (userItemsTotal / itemsTotal) * serviceChargeAmount 
    : 0);
  
  const numberOfParticipants = receipt.participants.length;
  const coverPerPerson = roundToTwoDecimals(numberOfParticipants > 0 ? receipt.cover / numberOfParticipants : 0);
  
  const userTotal = roundToTwoDecimals(userItemsTotal + userServiceCharge + coverPerPerson);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface-alt rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Estilo de recibo */}
        <div className="bg-tertiary px-6 py-4 border-b border-border-strong">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <svg
                className="w-6 h-6 text-text-primary"
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
              <h2 className="text-lg font-bold text-text-primary">Resumo do Recibo</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-text-muted hover:text-text-primary transition-colors"
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
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Recibo:</span>
            <span className="text-text-primary font-medium">#{receipt.inviteCode.slice(0, 8).toUpperCase()}</span>
          </div>
        </div>

        {/* Conteúdo do recibo */}
        <div className="px-6 py-4 bg-secondary-soft">
          {/* Informações do recibo */}
          <div className="mb-4 pb-3 border-b border-border-strong">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-text-secondary">Data:</span>
              <span className="text-text-primary">
                {new Date(receipt.date).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Título:</span>
              <span className="text-text-primary font-medium">{receipt.title}</span>
            </div>
          </div>

          {/* Linha separadora */}
          <div className="border-t border-border-strong mb-4"></div>

          {/* Lista de itens */}
          <div className="mb-4">
            {userItems.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-4">
                Nenhum item adicionado
              </p>
            ) : (
              <div className="space-y-3">
                {userItems.map((item) => {
                  const itemTotal = calculateItemTotal(item);
                  return (
                    <div
                      key={item.id}
                      className="flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <p className="text-text-primary font-medium">
                          {item.name}
                        </p>
                        <p className="text-text-secondary text-sm">
                          {item.quantity}x {formatCurrency(item.price)}
                        </p>
                      </div>
                      <p className="text-text-primary font-semibold">
                        {formatCurrency(itemTotal)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Linha separadora */}
          <div className="border-t border-border-strong mb-4"></div>

          {/* Subtotal */}
          {userItemsTotal > 0 && (
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-text-secondary">Subtotal:</span>
              <span className="text-text-primary">
                {formatCurrency(userItemsTotal)}
              </span>
            </div>
          )}

          {/* Taxa do garçom */}
          {userServiceCharge > 0 && (
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-text-secondary">
                Taxa do garçom ({receipt.serviceChargePercent}%):
              </span>
              <span className="text-text-primary">
                {formatCurrency(userServiceCharge)}
              </span>
            </div>
          )}

          {/* Cover */}
          {coverPerPerson > 0 && (
            <div className="flex items-center justify-between mb-4 text-sm">
              <span className="text-text-secondary">Cover:</span>
              <span className="text-text-primary">
                {formatCurrency(coverPerPerson)}
              </span>
            </div>
          )}

          {/* Linha separadora mais grossa */}
          <div className="border-t-2 border-primary mb-4"></div>

          {/* Total */}
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-text-primary">Total</span>
            <span className="text-2xl font-bold text-text-primary">
              {formatCurrency(userTotal)}
            </span>
          </div>

          {/* Informações do participante */}
          <div className="mt-6 pt-4 border-t border-border-strong">
            <div className="flex items-center gap-2 text-sm mb-2">
              <svg
                className="w-4 h-4 text-text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span className="text-text-secondary">Participante:</span>
              <span className="text-text-primary font-medium">{userName}</span>
            </div>
          </div>
        </div>

        {/* Botão de fechar */}
        <div className="px-6 py-4 bg-tertiary border-t border-border-strong">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 rounded-lg bg-surface text-text-primary font-medium hover:bg-secondary-hover transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
