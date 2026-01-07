import { Receipt, Participant, ReceiptItem, PendingParticipant, DeletionRequest } from '@/types';
import { transformToCamelCase } from '@/lib/api';

/**
 * Interface para receber dados do recibo da API (snake_case)
 */
export interface ApiReceipt {
  id: string;
  title: string;
  date: string;
  creator_id: string;
  invite_code: string;
  participants: any[];
  pending_participants: any[];
  items: any[];
  deletion_requests: any[];
  service_charge_percent: number;
  cover: number;
  total: number;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Transforma um recibo da API (snake_case) para o formato do frontend (camelCase)
 */
export function transformReceiptFromApi(apiReceipt: ApiReceipt): Receipt {
  return {
    id: apiReceipt.id,
    title: apiReceipt.title,
    date: apiReceipt.date,
    creatorId: apiReceipt.creator_id,
    inviteCode: apiReceipt.invite_code,
    participants: transformToCamelCase<Participant[]>(apiReceipt.participants || []),
    pendingParticipants: transformToCamelCase<PendingParticipant[]>(apiReceipt.pending_participants || []),
    items: transformToCamelCase<ReceiptItem[]>(apiReceipt.items || []),
    deletionRequests: transformToCamelCase<DeletionRequest[]>(apiReceipt.deletion_requests || []),
    serviceChargePercent: apiReceipt.service_charge_percent || 0,
    cover: apiReceipt.cover || 0,
    total: apiReceipt.total || 0,
    isClosed: apiReceipt.is_closed || false,
    createdAt: apiReceipt.created_at,
    updatedAt: apiReceipt.updated_at,
  };
}
