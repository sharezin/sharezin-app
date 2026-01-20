import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAuthUser, createAuthResponse } from '@/lib/auth';

// GET /api/subscriptions - Obter assinatura ativa do usuário
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return createAuthResponse('Não autenticado');
    }

    const supabase = createServerClient();

    // Buscar assinatura ativa do usuário
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        plans (*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Se não houver assinatura ativa, retornar plano gratuito
    if (!subscription) {
      const { data: freePlan, error: freePlanError } = await supabase
        .from('plans')
        .select('*')
        .eq('name', 'free')
        .single();

      if (freePlanError || !freePlan) {
        throw new Error('Plano gratuito não encontrado');
      }

      return NextResponse.json({
        subscription: null,
        plan: {
          id: freePlan.id,
          name: freePlan.name,
          displayName: freePlan.display_name,
          description: freePlan.description,
          priceMonthly: parseFloat(freePlan.price_monthly || 0),
          maxParticipantsPerReceipt: freePlan.max_participants_per_receipt,
          maxReceiptsPerMonth: freePlan.max_receipts_per_month,
          maxHistoryReceipts: freePlan.max_history_receipts,
          features: freePlan.features || {},
          isActive: freePlan.is_active,
        },
        expiresAt: null, // Plano gratuito não tem expiração
      });
    }

    // Transformar dados
    const plan = subscription.plans;
    
    // Calcular data de expiração: se não houver expires_at, calcular baseado em started_at + 1 mês
    let expiresAt = subscription.expires_at;
    if (!expiresAt && subscription.started_at) {
      const startDate = new Date(subscription.started_at);
      const expiryDate = new Date(startDate);
      expiryDate.setMonth(expiryDate.getMonth() + 1);
      expiresAt = expiryDate.toISOString();
    }
    
    const transformedSubscription = {
      id: subscription.id,
      userId: subscription.user_id,
      planId: subscription.plan_id,
      status: subscription.status,
      startedAt: subscription.started_at,
      expiresAt: expiresAt,
      cancelledAt: subscription.cancelled_at,
      createdAt: subscription.created_at,
      updatedAt: subscription.updated_at,
      plan: {
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
      },
    };

    return NextResponse.json({
      subscription: transformedSubscription,
      plan: transformedSubscription.plan,
      expiresAt: expiresAt, // Incluir também no nível raiz para facilitar acesso
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar assinatura' },
      { status: 500 }
    );
  }
}

// POST /api/subscriptions - Criar nova assinatura
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return createAuthResponse('Não autenticado');
    }

    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json(
        { error: 'ID do plano é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verificar se o plano existe
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Plano não encontrado' },
        { status: 404 }
      );
    }

    // Cancelar assinatura ativa anterior (se houver)
    await supabase
      .from('user_subscriptions')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('status', 'active');

    // Calcular data de expiração (1 mês a partir de agora)
    const startedAt = new Date();
    const expiresAt = new Date(startedAt);
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    // Criar nova assinatura
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        plan_id: planId,
        status: 'active',
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select(`
        *,
        plans (*)
      `)
      .single();

    if (subError) {
      throw subError;
    }

    // Transformar dados
    const planData = subscription.plans;
    const transformedSubscription = {
      id: subscription.id,
      userId: subscription.user_id,
      planId: subscription.plan_id,
      status: subscription.status,
      startedAt: subscription.started_at,
      expiresAt: subscription.expires_at,
      cancelledAt: subscription.cancelled_at,
      createdAt: subscription.created_at,
      updatedAt: subscription.updated_at,
      plan: {
        id: planData.id,
        name: planData.name,
        displayName: planData.display_name,
        description: planData.description,
        priceMonthly: parseFloat(planData.price_monthly || 0),
        maxParticipantsPerReceipt: planData.max_participants_per_receipt,
        maxReceiptsPerMonth: planData.max_receipts_per_month,
        maxHistoryReceipts: planData.max_history_receipts,
        features: planData.features || {},
        isActive: planData.is_active,
      },
    };

    return NextResponse.json({ 
      subscription: transformedSubscription,
      expiresAt: subscription.expires_at, // Incluir também no nível raiz
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao criar assinatura' },
      { status: 500 }
    );
  }
}

// PUT /api/subscriptions - Cancelar assinatura ativa
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return createAuthResponse('Não autenticado');
    }

    const body = await request.json();
    const { action } = body;

    if (action !== 'cancel') {
      return NextResponse.json(
        { error: 'Ação inválida' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Buscar assinatura ativa
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'Nenhuma assinatura ativa encontrada' },
        { status: 404 }
      );
    }

    // Cancelar assinatura
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      message: 'Assinatura cancelada com sucesso',
      subscription: {
        id: subscription.id,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao cancelar assinatura' },
      { status: 500 }
    );
  }
}
