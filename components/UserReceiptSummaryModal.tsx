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
        className="w-full max-w-md bg-zinc-900 dark:bg-black rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Estilo de recibo */}
        <div className="bg-zinc-800 px-6 py-4 border-b border-zinc-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
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
              <h2 className="text-lg font-bold text-white">Resumo do Recibo</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-white transition-colors"
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
            <span className="text-zinc-400">Recibo:</span>
            <span className="text-white font-medium">#{receipt.inviteCode.slice(0, 8).toUpperCase()}</span>
          </div>
        </div>

        {/* Conteúdo do recibo */}
        <div className="px-6 py-4 bg-zinc-50 dark:bg-black">
          {/* Informações do recibo */}
          <div className="mb-4 pb-3 border-b border-zinc-300 dark:border-zinc-700">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-zinc-600 dark:text-zinc-400">Data:</span>
              <span className="text-zinc-900 dark:text-zinc-100">
                {new Date(receipt.date).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Título:</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">{receipt.title}</span>
            </div>
          </div>

          {/* Linha separadora */}
          <div className="border-t border-zinc-300 dark:border-zinc-700 mb-4"></div>

          {/* Lista de itens */}
          <div className="mb-4">
            {userItems.length === 0 ? (
              <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center py-4">
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
                        <p className="text-zinc-900 dark:text-zinc-100 font-medium">
                          {item.name}
                        </p>
                        <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                          {item.quantity}x {formatCurrency(item.price)}
                        </p>
                      </div>
                      <p className="text-zinc-900 dark:text-zinc-100 font-semibold">
                        {formatCurrency(itemTotal)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Linha separadora */}
          <div className="border-t border-zinc-300 dark:border-zinc-700 mb-4"></div>

          {/* Subtotal */}
          {userItemsTotal > 0 && (
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Subtotal:</span>
              <span className="text-zinc-900 dark:text-zinc-100">
                {formatCurrency(userItemsTotal)}
              </span>
            </div>
          )}

          {/* Taxa do garçom */}
          {userServiceCharge > 0 && (
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">
                Taxa do garçom ({receipt.serviceChargePercent}%):
              </span>
              <span className="text-zinc-900 dark:text-zinc-100">
                {formatCurrency(userServiceCharge)}
              </span>
            </div>
          )}

          {/* Cover */}
          {coverPerPerson > 0 && (
            <div className="flex items-center justify-between mb-4 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Cover:</span>
              <span className="text-zinc-900 dark:text-zinc-100">
                {formatCurrency(coverPerPerson)}
              </span>
            </div>
          )}

          {/* Linha separadora mais grossa */}
          <div className="border-t-2 border-zinc-900 dark:border-zinc-100 mb-4"></div>

          {/* Total */}
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Total</span>
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {formatCurrency(userTotal)}
            </span>
          </div>

          {/* Informações do participante */}
          <div className="mt-6 pt-4 border-t border-zinc-300 dark:border-zinc-700">
            <div className="flex items-center gap-2 text-sm mb-2">
              <svg
                className="w-4 h-4 text-zinc-600 dark:text-zinc-400"
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
              <span className="text-zinc-600 dark:text-zinc-400">Participante:</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">{userName}</span>
            </div>
          </div>
        </div>

        {/* Botão de fechar */}
        <div className="px-6 py-4 bg-zinc-800 border-t border-zinc-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 rounded-lg bg-white dark:bg-zinc-700 text-black dark:text-white font-medium hover:bg-zinc-100 dark:hover:bg-zinc-600 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
