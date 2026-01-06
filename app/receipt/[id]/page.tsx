'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useReceipts } from '@/hooks/useReceipts';
import { useCalculations } from '@/hooks/useCalculations';
import { useAuth } from '@/hooks/useAuth';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { ProductForm } from '@/components/ProductForm';
import { AlertModal, ConfirmModal } from '@/components/Modal';
import { InviteCodeModal } from '@/components/InviteCodeModal';
import { ParticipantReceiptModal } from '@/components/ParticipantReceiptModal';
import { UserReceiptSummaryModal } from '@/components/UserReceiptSummaryModal';
import { Receipt, ReceiptItem, Participant, DeletionRequest, PendingParticipant } from '@/types';
import { formatCurrency, calculateItemTotal, calculateItemsTotal, calculateServiceChargeAmount } from '@/lib/calculations';
import { jsPDF } from 'jspdf';

export default function ReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getReceiptById, updateReceipt } = useReceipts();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'summary'>('history');
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: 'info' | 'success' | 'warning' | 'error';
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    itemId: string | null;
  }>({
    isOpen: false,
    itemId: null,
  });
  const [showMenu, setShowMenu] = useState(false);
  const [showInviteCodeModal, setShowInviteCodeModal] = useState(false);
  const [showUserReceiptSummary, setShowUserReceiptSummary] = useState(false);
  const [closingReceipt, setClosingReceipt] = useState(false);
  const [closingParticipation, setClosingParticipation] = useState(false);
  const [acceptingParticipantId, setAcceptingParticipantId] = useState<string | null>(null);
  const [rejectingParticipantId, setRejectingParticipantId] = useState<string | null>(null);
  const [requestingDeletionItemId, setRequestingDeletionItemId] = useState<string | null>(null);
  const [approvingDeletionRequestId, setApprovingDeletionRequestId] = useState<string | null>(null);
  const [rejectingDeletionRequestId, setRejectingDeletionRequestId] = useState<string | null>(null);
  const [showParticipantReceipt, setShowParticipantReceipt] = useState(false);

  const { user, loading: authLoading } = useAuth();
  const { receiptTotal, participantTotals } = useCalculations(receipt);
  
  // Pull-to-refresh para atualizar o recibo manualmente
  const { isRefreshing, pullDistance, pullProgress } = usePullToRefresh({
    onRefresh: async () => {
      if (receipt?.id) {
        await loadReceipt();
      }
    },
    enabled: !!receipt?.id && !loading,
  });

  // ID e nome do usuário atual - usar useMemo para evitar mudanças desnecessárias
  const currentUserId = useMemo(() => user?.id || '', [user?.id]);
  const currentUserName = useMemo(() => user?.name || 'Usuário', [user?.name]);

  // Verifica se o usuário atual é o criador do recibo
  const isCreator = useMemo(() => receipt?.creatorId === currentUserId, [receipt?.creatorId, currentUserId]);

  const loadReceipt = async () => {
    const id = params.id as string;
    const loadedReceipt = await getReceiptById(id);
    
    if (!loadedReceipt) {
      router.push('/');
      return;
    }
    
    setReceipt(loadedReceipt);
    setLoading(false);
  };

  useEffect(() => {
    // Só carregar o recibo quando o usuário estiver disponível
    // Isso evita problemas de renderização com currentUserId vazio
    if (user?.id) {
      loadReceipt();
    }
  }, [params.id, getReceiptById, router, user?.id]);


  // Fallback: Recarrega o recibo quando a página volta a ficar visível (caso Realtime não esteja disponível)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && receipt?.id) {
        loadReceipt();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [receipt?.id]);

  const handleAddProduct = async (item: ReceiptItem, participant: Participant) => {
    if (!receipt) {
      throw new Error('Recibo não encontrado');
    }

    if (receipt.isClosed) {
      throw new Error('Não é possível adicionar produtos a um recibo fechado');
    }

    // Verifica se o participante fechou sua participação (mas o criador sempre pode adicionar)
    const currentParticipant = receipt.participants.find(p => p.id === participant.id);
    if (currentParticipant?.isClosed && !isCreator) {
      throw new Error('Você fechou sua participação neste recibo e não pode mais adicionar produtos');
    }

    // Verifica se o participante já existe (mesmo nome, case-insensitive)
    const existingParticipant = receipt.participants.find(
      p => p.name.toLowerCase() === participant.name.toLowerCase()
    );

    // Usa o participante existente ou o novo
    const finalParticipant = existingParticipant || participant;

    // Atualiza o participantId do item para usar o ID do participante
    const updatedItem: ReceiptItem = {
      ...item,
      participantId: finalParticipant.id,
    };

    // Adiciona o participante apenas se não existir
    const updatedParticipants = existingParticipant
      ? receipt.participants
      : [...receipt.participants, finalParticipant];

    const updatedReceipt: Receipt = {
      ...receipt,
      items: [...receipt.items, updatedItem],
      participants: updatedParticipants,
    };

    try {
      const savedReceipt = await updateReceipt(updatedReceipt);
      setReceipt(savedReceipt);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao adicionar produto. Tente novamente.';
      setAlertModal({
        isOpen: true,
        title: 'Erro',
        message: errorMessage,
        variant: 'error',
      });
      // Lança o erro para que o ProductForm possa capturar e não fechar o modal
      throw error;
    }
  };

  const handleRemoveItem = (itemId: string) => {
    if (!receipt || !isCreator) return;
    setDeleteConfirm({ isOpen: true, itemId });
  };

  const confirmDeleteItem = async () => {
    if (!receipt || !deleteConfirm.itemId) return;
    
    // Remove o item e também remove solicitações relacionadas
    const updatedReceipt: Receipt = {
      ...receipt,
      items: receipt.items.filter(item => item.id !== deleteConfirm.itemId),
      deletionRequests: receipt.deletionRequests.filter(req => req.itemId !== deleteConfirm.itemId),
    };

    try {
      const savedReceipt = await updateReceipt(updatedReceipt);
      setReceipt(savedReceipt);
      setDeleteConfirm({ isOpen: false, itemId: null });
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao excluir produto. Tente novamente.',
        variant: 'error',
      });
    }
  };

  const handleRequestDeletion = async (itemId: string) => {
    if (!receipt) return;

    // Verifica se já existe uma solicitação para este item
    const existingRequest = receipt.deletionRequests.find(req => req.itemId === itemId);
    if (existingRequest) {
      setAlertModal({
        isOpen: true,
        title: 'Aviso',
        message: 'Você já solicitou a exclusão deste produto',
        variant: 'warning',
      });
      return;
    }

    // Encontra o item para verificar se pertence ao participante atual
    const item = receipt.items.find(i => i.id === itemId);
    if (!item || item.participantId !== currentUserId) {
      setAlertModal({
        isOpen: true,
        title: 'Aviso',
        message: 'Você só pode solicitar a exclusão de produtos que você cadastrou',
        variant: 'warning',
      });
      return;
    }

    setRequestingDeletionItemId(itemId);

    const newRequest: DeletionRequest = {
      id: crypto.randomUUID(),
      itemId,
      participantId: currentUserId,
      requestedAt: new Date().toISOString(),
    };

    const updatedReceipt: Receipt = {
      ...receipt,
      deletionRequests: [...receipt.deletionRequests, newRequest],
    };

    try {
      const savedReceipt = await updateReceipt(updatedReceipt);
      setReceipt(savedReceipt);
      setAlertModal({
        isOpen: true,
        title: 'Sucesso',
        message: 'Solicitação de exclusão enviada ao criador do recibo',
        variant: 'success',
      });
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao enviar solicitação. Tente novamente.',
        variant: 'error',
      });
    } finally {
      setRequestingDeletionItemId(null);
    }
  };

  const handleApproveDeletion = async (requestId: string) => {
    if (!receipt || !isCreator) return;

    const request = receipt.deletionRequests.find(req => req.id === requestId);
    if (!request) return;

    setApprovingDeletionRequestId(requestId);

    // Remove o item e a solicitação
    const updatedReceipt: Receipt = {
      ...receipt,
      items: receipt.items.filter(item => item.id !== request.itemId),
      deletionRequests: receipt.deletionRequests.filter(req => req.id !== requestId),
    };

    try {
      const savedReceipt = await updateReceipt(updatedReceipt);
      setReceipt(savedReceipt);
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao aprovar exclusão. Tente novamente.',
        variant: 'error',
      });
    } finally {
      setApprovingDeletionRequestId(null);
    }
  };

  const handleRejectDeletion = async (requestId: string) => {
    if (!receipt || !isCreator) return;

    setRejectingDeletionRequestId(requestId);

    const updatedReceipt: Receipt = {
      ...receipt,
      deletionRequests: receipt.deletionRequests.filter(req => req.id !== requestId),
    };

    try {
      const savedReceipt = await updateReceipt(updatedReceipt);
      setReceipt(savedReceipt);
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao rejeitar exclusão. Tente novamente.',
        variant: 'error',
      });
    } finally {
      setRejectingDeletionRequestId(null);
    }
  };

  // Verifica se há solicitação pendente para um item
  const getDeletionRequest = (itemId: string): DeletionRequest | undefined => {
    if (!receipt) return undefined;
    return receipt.deletionRequests.find(req => req.itemId === itemId);
  };

  const handleAcceptParticipant = async (pendingParticipantId: string) => {
    if (!receipt || !isCreator) return;

    const pendingParticipant = receipt.pendingParticipants.find(p => p.id === pendingParticipantId);
    if (!pendingParticipant) return;

    setAcceptingParticipantId(pendingParticipantId);

    // Cria o participante
    const newParticipant: Participant = {
      id: pendingParticipant.userId,
      name: pendingParticipant.name,
    };

    // Remove da lista de pendentes e adiciona aos participantes
    const updatedReceipt: Receipt = {
      ...receipt,
      pendingParticipants: receipt.pendingParticipants.filter(p => p.id !== pendingParticipantId),
      participants: [...receipt.participants, newParticipant],
    };

    try {
      const savedReceipt = await updateReceipt(updatedReceipt);
      setReceipt(savedReceipt);
      
      setAlertModal({
        isOpen: true,
        title: 'Sucesso',
        message: `${pendingParticipant.name} foi adicionado ao recibo`,
        variant: 'success',
      });
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao aceitar participante. Tente novamente.',
        variant: 'error',
      });
    } finally {
      setAcceptingParticipantId(null);
    }
  };

  const handleRejectParticipant = async (pendingParticipantId: string) => {
    if (!receipt || !isCreator) return;

    const pendingParticipant = receipt.pendingParticipants.find(p => p.id === pendingParticipantId);
    
    setRejectingParticipantId(pendingParticipantId);

    const updatedReceipt: Receipt = {
      ...receipt,
      pendingParticipants: receipt.pendingParticipants.filter(p => p.id !== pendingParticipantId),
    };

    try {
      const savedReceipt = await updateReceipt(updatedReceipt);
      setReceipt(savedReceipt);
      
      if (pendingParticipant) {
        setAlertModal({
          isOpen: true,
          title: 'Participante rejeitado',
          message: `A solicitação de ${pendingParticipant.name} foi rejeitada`,
          variant: 'info',
        });
      }
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao rejeitar participante. Tente novamente.',
        variant: 'error',
      });
    } finally {
      setRejectingParticipantId(null);
    }
  };

  const handleCloseReceipt = async () => {
    if (!receipt || !isCreator) return;

    setClosingReceipt(true);
    // Não fecha o menu imediatamente para mostrar o loading

    const updatedReceipt: Receipt = {
      ...receipt,
      isClosed: true,
    };

    try {
      const savedReceipt = await updateReceipt(updatedReceipt);
      setReceipt(savedReceipt);
      setShowMenu(false); // Fecha o menu apenas após o sucesso
      
      setAlertModal({
        isOpen: true,
        title: 'Recibo Fechado',
        message: 'O recibo foi fechado. Ninguém poderá mais adicionar produtos.',
        variant: 'success',
      });
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao fechar recibo. Tente novamente.',
        variant: 'error',
      });
    } finally {
      setClosingReceipt(false);
    }
  };

  const generateReceiptPDF = (receipt: Receipt) => {
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
  };

  const handleCloseParticipation = async () => {
    if (!receipt) return;

    const currentParticipant = receipt.participants.find(p => p.id === currentUserId);
    if (!currentParticipant) return;

    setClosingParticipation(true);
    // Não fecha o menu imediatamente para mostrar o loading

    const updatedParticipants = receipt.participants.map(p =>
      p.id === currentUserId ? { ...p, isClosed: true } : p
    );

    const updatedReceipt: Receipt = {
      ...receipt,
      participants: updatedParticipants,
    };

    try {
      const savedReceipt = await updateReceipt(updatedReceipt);
      setReceipt(savedReceipt);
      setShowMenu(false); // Fecha o menu apenas após o sucesso
      
      // Mostrar recibo do participante
      setShowParticipantReceipt(true);
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao fechar participação. Tente novamente.',
        variant: 'error',
      });
    } finally {
      setClosingParticipation(false);
    }
  };

  // Ordena itens por data de adição (mais recente primeiro)
  // Usa useMemo para evitar recálculos desnecessários e garantir estabilidade
  // IMPORTANTE: Este hook deve estar ANTES de qualquer early return para seguir as regras dos Hooks do React
  const sortedItems = useMemo(() => {
    if (!receipt?.items) return [];
    return [...receipt.items].sort(
      (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
    );
  }, [receipt?.items]);

  // Aguardar tanto o recibo quanto o usuário estarem carregados
  // Isso evita problemas de renderização quando currentUserId ainda não está disponível
  // IMPORTANTE: Este early return deve estar DEPOIS de todos os hooks
  if (loading || authLoading || !receipt || !user) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black relative">
      {/* Indicador de pull-to-refresh */}
      {pullDistance > 0 && (
        <div 
          className="fixed top-0 left-0 right-0 flex items-center justify-center z-50 transition-opacity duration-200"
          style={{
            transform: `translateY(${Math.min(pullDistance, 80)}px)`,
            opacity: Math.min(pullProgress, 1),
          }}
        >
          <div className="bg-zinc-800 dark:bg-zinc-900 text-white px-4 py-2 rounded-b-lg shadow-lg flex items-center gap-2">
            {isRefreshing ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm font-medium">Atualizando...</span>
              </>
            ) : (
              <>
                <svg 
                  className="h-5 w-5 transition-transform duration-200" 
                  style={{ transform: `rotate(${pullProgress * 180}deg)` }}
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span className="text-sm font-medium">
                  {pullProgress >= 1 ? 'Solte para atualizar' : 'Puxe para atualizar'}
                </span>
              </>
            )}
          </div>
        </div>
      )}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Voltar"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-black dark:text-zinc-50">
                {receipt.title}
              </h1>
            </div>
                {!receipt.isClosed && (
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      aria-label="Menu de opções"
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
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </button>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-lg z-50">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowUserReceiptSummary(true);
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors rounded-t-lg flex items-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
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
                      Meus Gastos
                    </button>
                    <div className="border-t border-zinc-200 dark:border-zinc-700"></div>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowInviteCodeModal(true);
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Ver Código de Convite
                    </button>
                    <div className="border-t border-zinc-200 dark:border-zinc-700"></div>
                    {isCreator ? (
                      <button
                        onClick={handleCloseReceipt}
                        disabled={receipt.isClosed || closingReceipt}
                        className="w-full px-4 py-3 text-left text-sm text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-b-lg flex items-center gap-2"
                      >
                        {closingReceipt ? (
                          <>
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Fechando...
                          </>
                        ) : receipt.isClosed ? (
                          'Recibo Fechado'
                        ) : (
                          'Fechar Recibo'
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const currentParticipant = receipt.participants.find(p => p.id === currentUserId);
                          if (currentParticipant?.isClosed) {
                            setAlertModal({
                              isOpen: true,
                              title: 'Participação já fechada',
                              message: 'Sua participação neste recibo já está fechada',
                              variant: 'info',
                            });
                          } else {
                            handleCloseParticipation();
                          }
                        }}
                        disabled={receipt.isClosed || receipt.participants.find(p => p.id === currentUserId)?.isClosed || closingParticipation}
                        className="w-full px-4 py-3 text-left text-sm text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-b-lg flex items-center gap-2"
                      >
                        {closingParticipation ? (
                          <>
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Fechando...
                          </>
                        ) : receipt.participants.find(p => p.id === currentUserId)?.isClosed ? (
                          'Participação Fechada'
                        ) : (
                          'Fechar Minha Participação'
                        )}
                      </button>
                    )}
                  </div>
                </>
              )}
                  </div>
                )}
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm">
            {new Date(receipt.date).toLocaleDateString('pt-BR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>

        {/* Total do Recibo */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-semibold text-black dark:text-zinc-50">
              Total do Recibo
            </span>
            <span className="text-2xl font-bold text-black dark:text-zinc-50">
              {formatCurrency(receiptTotal)}
            </span>
          </div>
          

          {(receipt.serviceChargePercent > 0 || receipt.cover > 0) && (
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <div className="flex justify-between">
                <span>Subtotal (itens):</span>
                <span>{formatCurrency(calculateItemsTotal(receipt))}</span>
              </div>
              {receipt.serviceChargePercent > 0 && (
                <div className="flex justify-between">
                  <span>Taxa do garçom ({receipt.serviceChargePercent}%):</span>
                  <span>{formatCurrency(calculateServiceChargeAmount(receipt))}</span>
                </div>
              )}
              {receipt.cover > 0 && (
                <div className="flex justify-between">
                  <span>Cover:</span>
                  <span>{formatCurrency(receipt.cover)}</span>
                </div>
              )}
            </div>
          )}

          {/* Botão para gerar PDF quando o recibo estiver fechado */}
          {receipt.isClosed && (
            <div className="pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => generateReceiptPDF(receipt)}
                className="w-full px-4 py-3 rounded-lg bg-zinc-800 dark:bg-zinc-700 text-white font-medium hover:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors flex items-center justify-center gap-2"
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
                Baixar Recibo em PDF
              </button>
            </div>
          )}
        </div>

        {/* Participantes Pendentes - Apenas para o criador */}
        {isCreator && (
          <>
            {receipt.pendingParticipants && receipt.pendingParticipants.length > 0 ? (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 mb-6 border border-yellow-200 dark:border-yellow-800">
                <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-4">
                  Participantes Pendentes ({receipt.pendingParticipants.length})
                </h3>
            <div className="space-y-3">
              {receipt.pendingParticipants.map(pending => (
                <div
                  key={pending.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-black dark:text-zinc-50">
                      {pending.name}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Solicitado em {new Date(pending.requestedAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptParticipant(pending.id)}
                      disabled={acceptingParticipantId !== null || rejectingParticipantId !== null}
                      className="px-3 py-1 text-sm rounded-lg bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {acceptingParticipantId === pending.id ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Aceitando...
                        </>
                      ) : (
                        'Aceitar'
                      )}
                    </button>
                    <button
                      onClick={() => handleRejectParticipant(pending.id)}
                      disabled={acceptingParticipantId !== null || rejectingParticipantId !== null}
                      className="px-3 py-1 text-sm rounded-lg bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {rejectingParticipantId === pending.id ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Rejeitando...
                        </>
                      ) : (
                        'Rejeitar'
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
            ) : null}
          </>
        )}


        {/* Tabs */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'text-black dark:text-zinc-50 border-b-2 border-black dark:border-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50'
              }`}
            >
              Histórico
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'summary'
                  ? 'text-black dark:text-zinc-50 border-b-2 border-black dark:border-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50'
              }`}
            >
              Resumo
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'history' && (
              <div>
                {sortedItems.length === 0 ? (
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                    Nenhum produto adicionado ainda.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {sortedItems.map(item => {
                      const itemTotal = calculateItemTotal(item);
                      const deletionRequest = getDeletionRequest(item.id);
                      const isItemOwner = item.participantId === currentUserId;
                      const canDelete = isCreator && !receipt.isClosed && !deletionRequest;
                      const canRequestDeletion = isItemOwner && !isCreator && !deletionRequest && !receipt.isClosed;
                      
                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-lg ${
                            deletionRequest
                              ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                              : 'bg-zinc-50 dark:bg-zinc-800'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-black dark:text-zinc-50">
                                {item.name}
                              </p>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {item.quantity}x {formatCurrency(item.price)} = {formatCurrency(itemTotal)}
                              </p>
                              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                                {new Date(item.addedAt).toLocaleString('pt-BR')}
                              </p>
                              {deletionRequest && (
                                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 font-medium">
                                  ⚠️ Solicitação de exclusão pendente
                                </p>
                              )}
                            </div>
                            <div className="ml-4 flex flex-col gap-2">
                              {canDelete && (
                                <button
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="px-3 py-1 text-sm rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  Excluir
                                </button>
                              )}
                              {canRequestDeletion && (
                                <button
                                  onClick={() => handleRequestDeletion(item.id)}
                                  disabled={requestingDeletionItemId === item.id}
                                  className="px-3 py-1 text-sm rounded text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                  {requestingDeletionItemId === item.id ? (
                                    <>
                                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Enviando...
                                    </>
                                  ) : (
                                    'Solicitar Exclusão'
                                  )}
                                </button>
                              )}
                              {deletionRequest && isCreator && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleApproveDeletion(deletionRequest.id)}
                                    disabled={approvingDeletionRequestId !== null || rejectingDeletionRequestId !== null}
                                    className="px-3 py-1 text-sm rounded-lg bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                  >
                                    {approvingDeletionRequestId === deletionRequest.id ? (
                                      <>
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Aceitando...
                                      </>
                                    ) : (
                                      'Aceitar'
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleRejectDeletion(deletionRequest.id)}
                                    disabled={approvingDeletionRequestId !== null || rejectingDeletionRequestId !== null}
                                    className="px-3 py-1 text-sm rounded-lg bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                  >
                                    {rejectingDeletionRequestId === deletionRequest.id ? (
                                      <>
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Recusando...
                                      </>
                                    ) : (
                                      'Recusar'
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'summary' && (
              <div>
                {receipt.participants.length === 0 ? (
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                    Nenhum participante ainda.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {receipt.participants
                      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                      .map(participant => {
                        const total = participantTotals[participant.id] || 0;
                        return (
                          <div
                            key={participant.id}
                            className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
                          >
                            <span className="font-medium text-black dark:text-zinc-50">
                              {participant.name || 'Sem nome'}
                            </span>
                            <span className="text-lg font-semibold text-black dark:text-zinc-50">
                              {formatCurrency(total)}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botão flutuante para adicionar produto */}
      {!receipt.isClosed && 
        (isCreator || !receipt.participants.find(p => p.id === currentUserId)?.isClosed) && (
        <button
          onClick={() => setShowProductForm(true)}
          className="fixed bottom-24 right-4 sm:right-6 w-14 h-14 rounded-full bg-black dark:bg-white text-white dark:text-black shadow-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all hover:scale-110 flex items-center justify-center z-40"
          aria-label="Adicionar Produto"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      )}

      {showProductForm && (
        <ProductForm
          onAdd={handleAddProduct}
          onClose={() => setShowProductForm(false)}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
        />
      )}

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
      />

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, itemId: null })}
        onConfirm={confirmDeleteItem}
        title="Excluir Produto"
        message="Tem certeza que deseja excluir este produto do recibo?"
        confirmText="Excluir"
        cancelText="Cancelar"
        confirmVariant="danger"
      />


      {receipt && (
        <>
          <InviteCodeModal
            isOpen={showInviteCodeModal}
            onClose={() => setShowInviteCodeModal(false)}
            inviteCode={receipt.inviteCode}
            receiptTitle={receipt.title}
          />
          <ParticipantReceiptModal
            isOpen={showParticipantReceipt}
            onClose={() => setShowParticipantReceipt(false)}
            receipt={receipt}
            participantId={currentUserId}
            participantName={currentUserName}
          />
          <UserReceiptSummaryModal
            isOpen={showUserReceiptSummary}
            onClose={() => setShowUserReceiptSummary(false)}
            receipt={receipt}
            userId={currentUserId}
            userName={currentUserName}
          />
        </>
      )}
    </div>
  );
}
