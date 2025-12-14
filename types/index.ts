export interface Participant {
  id: string;
  name: string;
  groupId?: string;
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
