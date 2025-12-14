import { Receipt, Group, Participant } from '@/types';

const RECEIPTS_KEY = 'sharezin_receipts';
const GROUPS_KEY = 'sharezin_groups';
const PARTICIPANTS_KEY = 'sharezin_participants';

// Receipts
export function saveReceipt(receipt: Receipt): void {
  const receipts = getReceipts();
  const index = receipts.findIndex(r => r.id === receipt.id);
  
  if (index >= 0) {
    receipts[index] = { ...receipt, updatedAt: new Date().toISOString() };
  } else {
    receipts.push(receipt);
  }
  
  localStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts));
}

export function getReceipts(): Receipt[] {
  if (typeof window === 'undefined') return [];
  
  const data = localStorage.getItem(RECEIPTS_KEY);
  const receipts: Receipt[] = data ? JSON.parse(data) : [];
  
  // Migração: adiciona campos faltantes para recibos antigos
  return receipts.map(receipt => ({
    ...receipt,
    creatorId: receipt.creatorId || 'default-user',
    deletionRequests: receipt.deletionRequests || [],
    inviteCode: receipt.inviteCode || '',
    pendingParticipants: receipt.pendingParticipants || [],
    isClosed: receipt.isClosed !== undefined ? receipt.isClosed : false,
  }));
}

export function getReceipt(id: string): Receipt | null {
  const receipts = getReceipts();
  const receipt = receipts.find(r => r.id === id);
  
  if (!receipt) return null;
  
  // Migração: adiciona campos faltantes para recibos antigos
  return {
    ...receipt,
    creatorId: receipt.creatorId || 'default-user',
    deletionRequests: receipt.deletionRequests || [],
    inviteCode: receipt.inviteCode || '',
    pendingParticipants: receipt.pendingParticipants || [],
    isClosed: receipt.isClosed !== undefined ? receipt.isClosed : false,
  };
}

export function getReceiptByInviteCode(inviteCode: string): Receipt | null {
  const receipts = getReceipts();
  const receipt = receipts.find(r => r.inviteCode?.toUpperCase() === inviteCode.toUpperCase());
  
  if (!receipt) return null;
  
  // Migração: adiciona campos faltantes para recibos antigos
  return {
    ...receipt,
    creatorId: receipt.creatorId || 'default-user',
    deletionRequests: receipt.deletionRequests || [],
    inviteCode: receipt.inviteCode || '',
    pendingParticipants: receipt.pendingParticipants || [],
  };
}

export function deleteReceipt(id: string): void {
  const receipts = getReceipts();
  const filtered = receipts.filter(r => r.id !== id);
  localStorage.setItem(RECEIPTS_KEY, JSON.stringify(filtered));
}

// Groups
export function saveGroup(group: Group): void {
  const groups = getGroups();
  const index = groups.findIndex(g => g.id === group.id);
  
  if (index >= 0) {
    groups[index] = group;
  } else {
    groups.push(group);
  }
  
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

export function getGroups(): Group[] {
  if (typeof window === 'undefined') return [];
  
  const data = localStorage.getItem(GROUPS_KEY);
  return data ? JSON.parse(data) : [];
}

export function getGroup(id: string): Group | null {
  const groups = getGroups();
  return groups.find(g => g.id === id) || null;
}

export function deleteGroup(id: string): void {
  const groups = getGroups();
  const filtered = groups.filter(g => g.id !== id);
  localStorage.setItem(GROUPS_KEY, JSON.stringify(filtered));
}

// Participants
export function saveParticipant(participant: Participant): void {
  const participants = getParticipants();
  const index = participants.findIndex(p => p.id === participant.id);
  
  if (index >= 0) {
    participants[index] = participant;
  } else {
    participants.push(participant);
  }
  
  localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify(participants));
}

export function getParticipants(): Participant[] {
  if (typeof window === 'undefined') return [];
  
  const data = localStorage.getItem(PARTICIPANTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function getParticipant(id: string): Participant | null {
  const participants = getParticipants();
  return participants.find(p => p.id === id) || null;
}

export function deleteParticipant(id: string): void {
  const participants = getParticipants();
  const filtered = participants.filter(p => p.id !== id);
  localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify(filtered));
}

export function getParticipantsByGroup(groupId: string): Participant[] {
  const participants = getParticipants();
  return participants.filter(p => p.groupId === groupId);
}

