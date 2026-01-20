export interface Participant {
  id: string;
  name: string;
  groupId?: string;
  userId?: string; // ID do usuário associado ao participante
  isClosed?: boolean; // indica se o participante fechou sua participação
}

export interface PendingParticipant {
  id: string;
  name: string;
  requestedAt: string;
  userId: string; // ID do usuário que solicitou (será substituído por conta logada futuramente)
}

export interface Group {
  id: string;
  name: string;
  participantIds: string[];
}

export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  participantId: string; // participante que pediu o produto
  addedAt: string; // timestamp de quando foi adicionado
}

export interface DeletionRequest {
  id: string;
  itemId: string;
  participantId: string; // participante que solicitou a exclusão
  requestedAt: string;
}

export interface Receipt {
  id: string;
  title: string;
  date: string;
  creatorId: string; // ID do criador do recibo (participante padrão por enquanto)
  inviteCode: string; // código único para convidar participantes
  participants: Participant[]; // criados automaticamente quando adicionam produtos
  pendingParticipants: PendingParticipant[]; // participantes aguardando aprovação
  items: ReceiptItem[];
  deletionRequests: DeletionRequest[]; // solicitações de exclusão pendentes
  serviceChargePercent: number; // taxa do garçom em porcentagem (0-100)
  cover: number; // cover (valor fixo)
  total: number;
  isClosed: boolean; // indica se o recibo está fechado
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = 
  | 'participant_request'
  | 'participant_approved'
  | 'participant_rejected'
  | 'deletion_request'
  | 'deletion_approved'
  | 'deletion_rejected'
  | 'receipt_closed'
  | 'item_added'
  | 'creator_transferred'
  | 'creator_transferred_from';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  receiptId?: string;
  relatedUserId?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanFeatures {
  dashboard?: boolean;
  analytics?: boolean;
  pdfExport?: boolean;
  excelExport?: boolean;
}

export interface Plan {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  priceMonthly: number;
  maxParticipantsPerReceipt: number | null; // null = ilimitado
  maxReceiptsPerMonth: number | null; // null = ilimitado
  maxHistoryReceipts: number | null; // null = ilimitado
  features: PlanFeatures;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  plan?: Plan;
  status: 'active' | 'cancelled' | 'expired';
  startedAt: string;
  expiresAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPlan {
  planId: string;
  planName: string;
  planDisplayName: string;
  maxParticipants: number | null;
  maxReceiptsPerMonth: number | null;
  maxHistoryReceipts: number | null;
  features: PlanFeatures;
  expiresAt?: string | null; // Data de expiração da assinatura mensal
}
