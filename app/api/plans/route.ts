import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET /api/plans - Listar todos os planos disponíveis
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    const { data: plans, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true });

    if (error) {
      throw error;
    }

    // Transformar snake_case para camelCase
    const transformedPlans = plans.map((plan: any) => ({
      id: plan.id,
      name: plan.name,
      displayName: plan.display_name,
      description: plan.description,
      priceMonthly: parseFloat(plan.price_monthly || 0),
      maxParticipantsPerReceipt: plan.max_participants_per_receipt,
      maxReceiptsPerMonth: plan.max_receipts_per_month,
      maxHistoryReceipts: plan.max_history_receipts,
      features: plan.features || {},
      isActive: plan.is_active,
      createdAt: plan.created_at,
      updatedAt: plan.updated_at,
    }));

    return NextResponse.json({ plans: transformedPlans });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar planos' },
      { status: 500 }
    );
  }
}
