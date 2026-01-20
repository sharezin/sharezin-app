import { createServerClient } from '@/lib/supabase';

export interface PlanLimits {
  maxParticipantsPerReceipt: number | null;
  maxReceiptsPerMonth: number | null;
  maxHistoryReceipts: number | null;
}

/**
 * Obtém o plano ativo do usuário e seus limites
 */
export async function getUserPlanLimits(userId: string): Promise<PlanLimits> {
  const supabase = createServerClient();

  // Buscar assinatura ativa do usuário
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select(`
      plan_id,
      plans (
        max_participants_per_receipt,
        max_receipts_per_month,
        max_history_receipts
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  // Se houver assinatura ativa, retornar limites do plano
  if (subscription && subscription.plans) {
    const plan = subscription.plans as any;
    return {
      maxParticipantsPerReceipt: plan.max_participants_per_receipt,
      maxReceiptsPerMonth: plan.max_receipts_per_month,
      maxHistoryReceipts: plan.max_history_receipts,
    };
  }

  // Se não houver assinatura ativa, retornar limites do plano gratuito
  const { data: freePlan } = await supabase
    .from('plans')
    .select('max_participants_per_receipt, max_receipts_per_month, max_history_receipts')
    .eq('name', 'free')
    .single();

  if (freePlan) {
    return {
      maxParticipantsPerReceipt: freePlan.max_participants_per_receipt,
      maxReceiptsPerMonth: freePlan.max_receipts_per_month,
      maxHistoryReceipts: freePlan.max_history_receipts,
    };
  }

  // Fallback: retornar limites padrão do plano gratuito
  return {
    maxParticipantsPerReceipt: 5,
    maxReceiptsPerMonth: 3,
    maxHistoryReceipts: 10,
  };
}

/**
 * Verifica se o usuário pode adicionar mais participantes ao recibo
 */
export async function canAddParticipant(
  userId: string,
  receiptId: string,
  currentParticipantCount: number
): Promise<{ allowed: boolean; reason?: string }> {
  const limits = await getUserPlanLimits(userId);

  // Se maxParticipantsPerReceipt é null, significa ilimitado
  if (limits.maxParticipantsPerReceipt === null) {
    return { allowed: true };
  }

  if (currentParticipantCount >= limits.maxParticipantsPerReceipt) {
    return {
      allowed: false,
      reason: `Limite de ${limits.maxParticipantsPerReceipt} participantes atingido. Faça upgrade para o plano Premium para participantes ilimitados.`,
    };
  }

  return { allowed: true };
}

/**
 * Verifica se o usuário pode criar mais recibos neste mês
 */
export async function canCreateReceipt(
  userId: string,
  receiptsThisMonth: number
): Promise<{ allowed: boolean; reason?: string }> {
  const limits = await getUserPlanLimits(userId);

  // Se maxReceiptsPerMonth é null, significa ilimitado
  if (limits.maxReceiptsPerMonth === null) {
    return { allowed: true };
  }

  if (receiptsThisMonth >= limits.maxReceiptsPerMonth) {
    return {
      allowed: false,
      reason: `Limite de ${limits.maxReceiptsPerMonth} recibos por mês atingido. Faça upgrade para o plano Premium para recibos ilimitados.`,
    };
  }

  return { allowed: true };
}

/**
 * Conta quantos recibos o usuário criou neste mês
 */
export async function countReceiptsThisMonth(userId: string): Promise<number> {
  const supabase = createServerClient();
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const { count } = await supabase
    .from('receipts')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', userId)
    .gte('created_at', firstDayOfMonth.toISOString());

  return count || 0;
}
