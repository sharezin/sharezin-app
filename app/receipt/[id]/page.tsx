'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useReceipts } from '@/hooks/useReceipts';
import { useCalculations } from '@/hooks/useCalculations';
import { useAuth } from '@/hooks/useAuth';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useReceiptPermissions } from '@/hooks/useReceiptPermissions';
import { AlertModal, ConfirmModal } from '@/components/Modal';
import { supabase } from '@/lib/supabase';
import { apiRequest } from '@/lib/api';
import { NotificationType } from '@/types';
import dynamic from 'next/dynamic';

const ProductForm = dynamic(() => import('@/components/ProductForm').then(mod => ({ default: mod.ProductForm })), {
  ssr: false,
});

const InviteCodeModal = dynamic(() => import('@/components/InviteCodeModal').then(mod => ({ default: mod.InviteCodeModal })), {
  ssr: false,
});

const ParticipantReceiptModal = dynamic(() => import('@/components/ParticipantReceiptModal').then(mod => ({ default: mod.ParticipantReceiptModal })), {
  ssr: false,
});

const UserReceiptSummaryModal = dynamic(() => import('@/components/UserReceiptSummaryModal').then(mod => ({ default: mod.UserReceiptSummaryModal })), {
  ssr: false,
});

const TransferCreatorModal = dynamic(() => import('@/components/TransferCreatorModal').then(mod => ({ default: mod.TransferCreatorModal })), {
  ssr: false,
});
import { ReceiptHeader } from '@/components/receipt/ReceiptHeader';
import { ReceiptTotalCard } from '@/components/receipt/ReceiptTotalCard';
import { PendingParticipantsList } from '@/components/receipt/PendingParticipantsList';
import { ReceiptTabs } from '@/components/receipt/ReceiptTabs';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { Receipt, ReceiptItem, Participant, DeletionRequest, PendingParticipant } from '@/types';
import { transformToCamelCase } from '@/lib/api';

export default function ReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getReceiptById, updateReceipt, removeParticipant, closeParticipantParticipation } = useReceipts();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
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
  const [closeReceiptConfirm, setCloseReceiptConfirm] = useState(false);
  const [closeParticipationConfirm, setCloseParticipationConfirm] = useState(false);
  const [showInviteCodeModal, setShowInviteCodeModal] = useState(false);
  const [showUserReceiptSummary, setShowUserReceiptSummary] = useState(false);
  const [closingReceipt, setClosingReceipt] = useState(false);
  const [closingParticipation, setClosingParticipation] = useState(false);
  const [acceptingParticipantId, setAcceptingParticipantId] = useState<string | null>(null);
  const [rejectingParticipantId, setRejectingParticipantId] = useState<string | null>(null);
  const [closingParticipantId, setClosingParticipantId] = useState<string | null>(null);
  const [removingParticipantId, setRemovingParticipantId] = useState<string | null>(null);
  const [participantToRemove, setParticipantToRemove] = useState<string | null>(null);
  const [requestingDeletionItemId, setRequestingDeletionItemId] = useState<string | null>(null);
  const [approvingDeletionRequestId, setApprovingDeletionRequestId] = useState<string | null>(null);
  const [rejectingDeletionRequestId, setRejectingDeletionRequestId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [showParticipantReceipt, setShowParticipantReceipt] = useState(false);
  const [showTransferCreatorModal, setShowTransferCreatorModal] = useState(false);
  const [transferringCreator, setTransferringCreator] = useState(false);
  
  // Ref para gerenciar Realtime
  const channelRef = useRef<any>(null);

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

  // Usa hook de permissões para centralizar lógica
  const { isCreator, canAddItems, canCloseReceipt, canCloseParticipation } = useReceiptPermissions({
    receipt,
    currentUserId,
  });


  const loadReceipt = useCallback(async () => {
    const id = params.id as string;
    const loadedReceipt = await getReceiptById(id);
    
    if (!loadedReceipt) {
      router.push('/');
      return;
    }
    
    setReceipt(loadedReceipt);
    setLoading(false);
  }, [params.id, getReceiptById, router]);

  // Funções auxiliares para atualizações granulares via Realtime
  const updateReceiptItem = useCallback((itemData: any, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => {
    try {
      setReceipt(prev => {
        if (!prev) return prev;
        
        const transformedItem = transformToCamelCase<ReceiptItem>(itemData);
        
        if (eventType === 'INSERT') {
          // Verificar se o item já existe para evitar duplicatas
          if (prev.items.some(i => i.id === transformedItem.id)) {
            return prev;
          }
          return { ...prev, items: [...prev.items, transformedItem] };
        } else if (eventType === 'UPDATE') {
          return {
            ...prev,
            items: prev.items.map(i => i.id === transformedItem.id ? transformedItem : i)
          };
        } else { // DELETE
          return {
            ...prev,
            items: prev.items.filter(i => i.id !== itemData.id)
          };
        }
      });
    } catch (error) {
      // Fallback: recarregar recibo se a atualização granular falhar
      loadReceipt();
    }
  }, [loadReceipt]);

  const updateParticipant = useCallback(async (participantData: any, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => {
    try {
      if (eventType === 'INSERT') {
        // Para INSERT, precisamos buscar os dados completos do participante
        // pois receipt_participants só tem o participant_id
        if (!supabase) return;
        
        const { data: participant, error } = await supabase
          .from('participants')
          .select('*')
          .eq('id', participantData.participant_id || participantData.id)
          .single();
        
        if (error) {
          loadReceipt();
          return;
        }
        
        if (participant) {
          const transformedParticipant = transformToCamelCase<Participant>(participant);
          setReceipt(prev => {
            if (!prev) return prev;
            // Verificar se já existe
            if (prev.participants.some(p => p.id === transformedParticipant.id)) {
              return prev;
            }
            return { ...prev, participants: [...prev.participants, transformedParticipant] };
          });
        }
      } else if (eventType === 'UPDATE') {
        const transformedParticipant = transformToCamelCase<Participant>(participantData);
        setReceipt(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            participants: prev.participants.map(p => 
              p.id === transformedParticipant.id ? transformedParticipant : p
            )
          };
        });
      } else { // DELETE
        setReceipt(prev => {
          if (!prev) return prev;
          const participantId = participantData.participant_id || participantData.id;
          return {
            ...prev,
            participants: prev.participants.filter(p => p.id !== participantId)
          };
        });
      }
    } catch (error) {
      loadReceipt();
    }
  }, [loadReceipt]);

  const updatePendingParticipant = useCallback((pendingParticipantData: any, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => {
    try {
      setReceipt(prev => {
        if (!prev) return prev;
        
        const transformedPendingParticipant = transformToCamelCase<PendingParticipant>(pendingParticipantData);
        
        if (eventType === 'INSERT') {
          // Verificar se já existe
          if (prev.pendingParticipants.some(p => p.id === transformedPendingParticipant.id)) {
            return prev;
          }
          return { ...prev, pendingParticipants: [...prev.pendingParticipants, transformedPendingParticipant] };
        } else if (eventType === 'UPDATE') {
          return {
            ...prev,
            pendingParticipants: prev.pendingParticipants.map(p => 
              p.id === transformedPendingParticipant.id ? transformedPendingParticipant : p
            )
          };
        } else { // DELETE
          return {
            ...prev,
            pendingParticipants: prev.pendingParticipants.filter(p => p.id !== pendingParticipantData.id)
          };
        }
      });
    } catch (error) {
      loadReceipt();
    }
  }, [loadReceipt]);

  const updateDeletionRequest = useCallback((deletionRequestData: any, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => {
    try {
      setReceipt(prev => {
        if (!prev) return prev;
        
        const transformedDeletionRequest = transformToCamelCase<DeletionRequest>(deletionRequestData);
        
        if (eventType === 'INSERT') {
          // Verificar se já existe
          if (prev.deletionRequests.some(d => d.id === transformedDeletionRequest.id)) {
            return prev;
          }
          return { ...prev, deletionRequests: [...prev.deletionRequests, transformedDeletionRequest] };
        } else if (eventType === 'UPDATE') {
          return {
            ...prev,
            deletionRequests: prev.deletionRequests.map(d => 
              d.id === transformedDeletionRequest.id ? transformedDeletionRequest : d
            )
          };
        } else { // DELETE
          return {
            ...prev,
            deletionRequests: prev.deletionRequests.filter(d => d.id !== deletionRequestData.id)
          };
        }
      });
    } catch (error) {
      loadReceipt();
    }
  }, [loadReceipt]);

  const updateReceiptMetadata = useCallback((receiptData: Partial<Receipt>) => {
    try {
      setReceipt(prev => {
        if (!prev) return prev;
        return { ...prev, ...receiptData };
      });
    } catch (error) {
      loadReceipt();
    }
  }, [loadReceipt]);

  useEffect(() => {
    // Só carregar o recibo quando o usuário estiver disponível
    // Isso evita problemas de renderização com currentUserId vazio
    if (user?.id) {
      loadReceipt();
    }
  }, [user?.id, loadReceipt]);


  // Configurar Realtime para o recibo específico
  useEffect(() => {
    if (!receipt?.id || !user?.id) {
      return;
    }

    // Limpar conexão anterior
    if (channelRef.current) {
      supabase?.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Tentar conectar ao Realtime para este recibo
    if (supabase) {
      try {
        const channel = supabase
          .channel(`receipt:${receipt.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'receipts',
              filter: `id=eq.${receipt.id}`,
            },
            (payload: { new: any; old: any }) => {
              // Atualizar apenas campos do recibo sem recarregar tudo
              const updatedData = transformToCamelCase<Partial<Receipt>>(payload.new);
              updateReceiptMetadata(updatedData);
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'receipt_items',
              filter: `receipt_id=eq.${receipt.id}`,
            },
            (payload: { new: any }) => {
              // Adicionar novo item granularmente
              updateReceiptItem(payload.new, 'INSERT');
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'receipt_items',
              filter: `receipt_id=eq.${receipt.id}`,
            },
            (payload: { new: any }) => {
              // Atualizar item existente granularmente
              updateReceiptItem(payload.new, 'UPDATE');
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'receipt_items',
              filter: `receipt_id=eq.${receipt.id}`,
            },
            (payload: { old: any }) => {
              // Remover item granularmente
              updateReceiptItem(payload.old, 'DELETE');
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'receipt_participants',
              filter: `receipt_id=eq.${receipt.id}`,
            },
            async (payload: { new: any }) => {
              // Adicionar novo participante granularmente
              await updateParticipant(payload.new, 'INSERT');
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'receipt_participants',
              filter: `receipt_id=eq.${receipt.id}`,
            },
            async (payload: { old: any }) => {
              // Remover participante granularmente
              await updateParticipant(payload.old, 'DELETE');
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'participants',
            },
            async (payload: { new: any }) => {
              // Verificar se o participante atualizado pertence a este recibo
              setReceipt(prev => {
                if (!prev) return prev;
                const participantExists = prev.participants.some(p => p.id === payload.new.id);
                if (!participantExists) return prev;
                
                // Atualizar participante granularmente
                const transformedParticipant = transformToCamelCase<Participant>(payload.new);
                return {
                  ...prev,
                  participants: prev.participants.map(p => 
                    p.id === transformedParticipant.id ? transformedParticipant : p
                  )
                };
              });
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'pending_participants',
              filter: `receipt_id=eq.${receipt.id}`,
            },
            (payload: { new: any }) => {
              // Adicionar novo participante pendente granularmente
              updatePendingParticipant(payload.new, 'INSERT');
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'pending_participants',
              filter: `receipt_id=eq.${receipt.id}`,
            },
            (payload: { new: any }) => {
              // Atualizar participante pendente granularmente
              updatePendingParticipant(payload.new, 'UPDATE');
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'pending_participants',
              filter: `receipt_id=eq.${receipt.id}`,
            },
            (payload: { old: any }) => {
              // Remover participante pendente granularmente
              updatePendingParticipant(payload.old, 'DELETE');
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'deletion_requests',
              filter: `receipt_id=eq.${receipt.id}`,
            },
            (payload: { new: any }) => {
              // Adicionar nova solicitação de exclusão granularmente
              updateDeletionRequest(payload.new, 'INSERT');
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'deletion_requests',
              filter: `receipt_id=eq.${receipt.id}`,
            },
            (payload: { new: any }) => {
              // Atualizar solicitação de exclusão granularmente
              updateDeletionRequest(payload.new, 'UPDATE');
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'deletion_requests',
              filter: `receipt_id=eq.${receipt.id}`,
            },
            (payload: { old: any }) => {
              // Remover solicitação de exclusão granularmente
              updateDeletionRequest(payload.old, 'DELETE');
            }
          )
          .subscribe();

        channelRef.current = channel;
      } catch (err) {
        // Erro ao configurar Realtime - fallback será usado
      }
    }

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase?.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [receipt?.id, user?.id, updateReceiptItem, updateParticipant, updatePendingParticipant, updateDeletionRequest, updateReceiptMetadata]);

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
      // Notificações agora são criadas automaticamente no backend
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
    
    setDeletingItemId(deleteConfirm.itemId);
    
    // Buscar o nome do item antes de removê-lo para o feedback
    const itemToDelete = receipt.items.find(item => item.id === deleteConfirm.itemId);
    const itemName = itemToDelete?.name || 'produto';
    
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
      
      // Feedback de sucesso
      setAlertModal({
        isOpen: true,
        title: 'Sucesso',
        message: `${itemName} foi removido do recibo`,
        variant: 'success',
      });
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao excluir produto. Tente novamente.',
        variant: 'error',
      });
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleRequestDeletion = async (itemId: string) => {
    if (!receipt) return;

    // Verifica se o participante fechou sua participação
    const currentParticipant = receipt.participants.find(p => p.id === currentUserId);
    if (currentParticipant?.isClosed) {
      setAlertModal({
        isOpen: true,
        title: 'Aviso',
        message: 'Você fechou sua participação neste recibo e não pode mais solicitar exclusão de itens',
        variant: 'warning',
      });
      return;
    }

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
      
      // Criar notificação para o criador do recibo
      if (receipt.creatorId) {
        try {
          await apiRequest('/api/notifications', {
            method: 'POST',
            body: JSON.stringify({
              userId: receipt.creatorId,
              type: 'deletion_request' as NotificationType,
              title: 'Solicitação de exclusão',
              message: `${currentUserName} solicitou excluir o item ${item.name} do recibo ${receipt.title}`,
              receiptId: receipt.id,
              relatedUserId: currentUserId,
            }),
          });
        } catch (error) {
          // Não falhar a operação principal se a notificação falhar
        }
      }
      
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
      
      // Buscar user_id do participante que solicitou a exclusão e criar notificação
      try {
        const participantUserIdResponse = await apiRequest<{ userId: string | null }>(
          `/api/participants/${request.participantId}/user-id`
        );
        
        if (participantUserIdResponse.userId) {
          await apiRequest('/api/notifications', {
            method: 'POST',
            body: JSON.stringify({
              userId: participantUserIdResponse.userId,
              type: 'deletion_approved' as NotificationType,
              title: 'Exclusão aprovada',
              message: `Sua solicitação para excluir o item foi aprovada no recibo ${receipt.title}`,
              receiptId: receipt.id,
              relatedUserId: currentUserId,
            }),
          });
        }
      } catch (error) {
        // Não falhar a operação principal se a notificação falhar
      }
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

    const request = receipt.deletionRequests.find(req => req.id === requestId);
    if (!request) return;

    setRejectingDeletionRequestId(requestId);

    const updatedReceipt: Receipt = {
      ...receipt,
      deletionRequests: receipt.deletionRequests.filter(req => req.id !== requestId),
    };

    try {
      const savedReceipt = await updateReceipt(updatedReceipt);
      setReceipt(savedReceipt);
      
      // Buscar user_id do participante que solicitou a exclusão e criar notificação
      try {
        const participantUserIdResponse = await apiRequest<{ userId: string | null }>(
          `/api/participants/${request.participantId}/user-id`
        );
        
        if (participantUserIdResponse.userId) {
          await apiRequest('/api/notifications', {
            method: 'POST',
            body: JSON.stringify({
              userId: participantUserIdResponse.userId,
              type: 'deletion_rejected' as NotificationType,
              title: 'Exclusão rejeitada',
              message: `Sua solicitação para excluir o item foi rejeitada no recibo ${receipt.title}`,
              receiptId: receipt.id,
              relatedUserId: currentUserId,
            }),
          });
        }
      } catch (error) {
        // Não falhar a operação principal se a notificação falhar
      }
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
      
      // Criar notificação para o participante aceito
      try {
        await apiRequest('/api/notifications', {
          method: 'POST',
          body: JSON.stringify({
            userId: pendingParticipant.userId,
            type: 'participant_approved' as NotificationType,
            title: 'Solicitação aceita',
            message: `Você foi aceito como participante do recibo ${receipt.title}`,
            receiptId: receipt.id,
            relatedUserId: currentUserId,
          }),
        });
      } catch (error) {
        // Não falhar a operação principal se a notificação falhar
      }
      
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
      
      // Criar notificação para o participante rejeitado
      if (pendingParticipant) {
        try {
          await apiRequest('/api/notifications', {
            method: 'POST',
            body: JSON.stringify({
              userId: pendingParticipant.userId,
              type: 'participant_rejected' as NotificationType,
              title: 'Solicitação rejeitada',
              message: `Sua solicitação para participar do recibo ${receipt.title} foi rejeitada`,
              receiptId: receipt.id,
              relatedUserId: currentUserId,
            }),
          });
        } catch (error) {
          // Não falhar a operação principal se a notificação falhar
        }
        
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

    const updatedReceipt: Receipt = {
      ...receipt,
      isClosed: true,
    };

    try {
      const savedReceipt = await updateReceipt(updatedReceipt);
      setReceipt(savedReceipt);
      
      // Fechar modal de confirmação
      setCloseReceiptConfirm(false);
      
      // Mostrar modal de feedback de sucesso
      setAlertModal({
        isOpen: true,
        title: 'Recibo Fechado',
        message: 'O recibo foi fechado. Ninguém poderá mais adicionar produtos.',
        variant: 'success',
      });
    } catch (error) {
      // Fechar modal de confirmação mesmo em caso de erro
      setCloseReceiptConfirm(false);
      
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

  const handleRemoveParticipant = async (participantId: string) => {
    if (!receipt || !isCreator) return;

    const participant = receipt.participants.find(p => p.id === participantId);
    if (!participant) return;

    setRemovingParticipantId(participantId);

    try {
      const updatedReceipt = await removeParticipant(receipt.id, participantId);
      setReceipt(updatedReceipt);
      
      setAlertModal({
        isOpen: true,
        title: 'Participante Removido',
        message: `${participant.name} foi removido do recibo e todos os seus produtos foram excluídos.`,
        variant: 'success',
      });
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao remover participante. Tente novamente.',
        variant: 'error',
      });
    } finally {
      setRemovingParticipantId(null);
      setParticipantToRemove(null);
    }
  };

  const handleCloseParticipantParticipation = async (participantId: string) => {
    if (!receipt || !isCreator) return;

    const participant = receipt.participants.find(p => p.id === participantId);
    if (!participant) return;

    setClosingParticipantId(participantId);

    try {
      const updatedReceipt = await closeParticipantParticipation(receipt.id, participantId);
      setReceipt(updatedReceipt);
      
      setAlertModal({
        isOpen: true,
        title: 'Participação Fechada',
        message: `A participação de ${participant.name} foi fechada. Ele não poderá mais adicionar produtos.`,
        variant: 'success',
      });
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao fechar participação. Tente novamente.',
        variant: 'error',
      });
    } finally {
      setClosingParticipantId(null);
    }
  };

  const handleCloseParticipation = async () => {
    if (!receipt) return;

    const currentParticipant = receipt.participants.find(p => p.id === currentUserId);
    if (!currentParticipant) return;

    setClosingParticipation(true);

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
      
      // Fechar modal de confirmação
      setCloseParticipationConfirm(false);
      
      // Mostrar modal de feedback de sucesso
      setAlertModal({
        isOpen: true,
        title: 'Participação Fechada',
        message: 'Sua participação foi fechada. Você não poderá mais adicionar produtos a este recibo.',
        variant: 'success',
      });
      
      // Mostrar recibo do participante após um pequeno delay para o usuário ver o feedback
      setTimeout(() => {
        setShowParticipantReceipt(true);
      }, 1500);
    } catch (error) {
      // Fechar modal de confirmação mesmo em caso de erro
      setCloseParticipationConfirm(false);
      
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

  const handleTransferCreatorComplete = async (updatedReceipt: Receipt) => {
    setReceipt(updatedReceipt);
    setShowTransferCreatorModal(false);
    setTransferringCreator(false);
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
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-text-secondary">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg relative">
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        pullProgress={pullProgress}
        isRefreshing={isRefreshing}
      />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <ReceiptHeader
          receipt={receipt}
          isCreator={isCreator}
          onCloseReceipt={() => setCloseReceiptConfirm(true)}
          onCloseParticipation={() => setCloseParticipationConfirm(true)}
          onShowInviteCode={() => setShowInviteCodeModal(true)}
          onShowUserReceiptSummary={() => setShowUserReceiptSummary(true)}
          onTransferCreator={() => setShowTransferCreatorModal(true)}
          closingReceipt={closingReceipt}
          closingParticipation={closingParticipation}
          currentUserId={currentUserId}
        />

        <ReceiptTotalCard receipt={receipt} receiptTotal={receiptTotal} />

        {isCreator && receipt.pendingParticipants && receipt.pendingParticipants.length > 0 && (
          <PendingParticipantsList
            pendingParticipants={receipt.pendingParticipants}
            onAccept={handleAcceptParticipant}
            onReject={handleRejectParticipant}
            acceptingId={acceptingParticipantId}
            rejectingId={rejectingParticipantId}
          />
        )}

        <ReceiptTabs
          receipt={receipt}
          sortedItems={sortedItems}
          currentUserId={currentUserId}
          isCreator={isCreator}
          participantTotals={participantTotals}
          getDeletionRequest={getDeletionRequest}
          onRemoveItem={handleRemoveItem}
          onRequestDeletion={handleRequestDeletion}
          onApproveDeletion={handleApproveDeletion}
          onRejectDeletion={handleRejectDeletion}
          requestingDeletionItemId={requestingDeletionItemId}
          approvingDeletionRequestId={approvingDeletionRequestId}
          rejectingDeletionRequestId={rejectingDeletionRequestId}
          onCloseParticipantParticipation={handleCloseParticipantParticipation}
          onRemoveParticipant={(participantId) => setParticipantToRemove(participantId)}
          closingParticipantId={closingParticipantId}
          removingParticipantId={removingParticipantId}
        />
      </div>

      {/* Botão flutuante para adicionar produto */}
      {canAddItems && (
        <button
          onClick={() => setShowProductForm(true)}
          className="fixed bottom-24 right-4 sm:right-6 w-14 h-14 rounded-full bg-primary text-text-inverse shadow-lg hover:bg-primary-hover transition-all hover:scale-110 flex items-center justify-center z-40"
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
        loading={deletingItemId !== null}
      />

      <ConfirmModal
        isOpen={participantToRemove !== null}
        onClose={() => {
          if (!removingParticipantId) {
            setParticipantToRemove(null);
          }
        }}
        onConfirm={() => {
          if (participantToRemove && !removingParticipantId) {
            handleRemoveParticipant(participantToRemove);
          }
        }}
        title="Excluir Participante"
        message={
          participantToRemove && receipt
            ? `Tem certeza que deseja excluir ${receipt.participants.find(p => p.id === participantToRemove)?.name || 'este participante'}? Todos os produtos adicionados por ele serão removidos.`
            : ''
        }
        confirmText="Excluir"
        cancelText="Cancelar"
        confirmVariant="danger"
        loading={removingParticipantId === participantToRemove}
        disabled={removingParticipantId === participantToRemove}
      />

      <ConfirmModal
        isOpen={closeReceiptConfirm}
        onClose={() => {
          if (!closingReceipt) {
            setCloseReceiptConfirm(false);
          }
        }}
        onConfirm={handleCloseReceipt}
        title="Fechar Recibo"
        message="Tem certeza que deseja fechar este recibo? Ninguém poderá mais adicionar produtos após o fechamento."
        confirmText="Fechar Recibo"
        cancelText="Cancelar"
        confirmVariant="warning"
        loading={closingReceipt}
        disabled={closingReceipt}
      />

      <ConfirmModal
        isOpen={closeParticipationConfirm}
        onClose={() => {
          if (!closingParticipation) {
            setCloseParticipationConfirm(false);
          }
        }}
        onConfirm={handleCloseParticipation}
        title="Fechar Minha Participação"
        message="Tem certeza que deseja fechar sua participação? Você não poderá mais adicionar produtos a este recibo após o fechamento."
        confirmText="Fechar Participação"
        cancelText="Cancelar"
        confirmVariant="warning"
        loading={closingParticipation}
        disabled={closingParticipation}
      />

      {receipt && (
        <>
          {showInviteCodeModal && (
            <InviteCodeModal
              isOpen={showInviteCodeModal}
              onClose={() => setShowInviteCodeModal(false)}
              inviteCode={receipt.inviteCode}
              receiptTitle={receipt.title}
            />
          )}
          {showParticipantReceipt && (
            <ParticipantReceiptModal
              isOpen={showParticipantReceipt}
              onClose={() => setShowParticipantReceipt(false)}
              receipt={receipt}
              participantId={currentUserId}
              participantName={currentUserName}
            />
          )}
          {showUserReceiptSummary && (
            <UserReceiptSummaryModal
              isOpen={showUserReceiptSummary}
              onClose={() => setShowUserReceiptSummary(false)}
              receipt={receipt}
              userId={currentUserId}
              userName={currentUserName}
            />
          )}
          {showTransferCreatorModal && (
            <TransferCreatorModal
              isOpen={showTransferCreatorModal}
              onClose={() => setShowTransferCreatorModal(false)}
              receipt={receipt}
              currentUserId={currentUserId}
              onTransferComplete={handleTransferCreatorComplete}
              isRequired={false}
            />
          )}
        </>
      )}
    </div>
  );
}
