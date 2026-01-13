import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, createAuthResponse } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';

// GET /api/receipts/dashboard-stats - Buscar estatísticas do dashboard
export async function GET(request: NextRequest) {
  // Cache no servidor - revalidar a cada 5 minutos
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year') || new Date().getFullYear().toString();
  
  // Headers de cache para o Next.js
  const headers = new Headers();
  headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600'); // 5 min cache, 10 min stale
  const user = await getAuthUser(request);
  if (!user) {
    return createAuthResponse('Não autenticado');
  }

  try {
    const supabase = createServerClient();

    // Buscar gastos por período (mensal) - apenas recibos fechados
    // Usar RPC ou query direta para agregação no banco
    const { data: expensesByPeriod, error: periodError } = await supabase
      .from('user_receipt_expenses')
      .select('period_month, total_spent, receipt_id')
      .eq('user_id', user.id)
      .eq('is_closed', true);

    if (periodError) {
      console.error('Error fetching expenses by period:', periodError);
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Erro ao buscar gastos por período' },
        { status: 500 }
      );
    }

    // Log removido para produção - cache reduz necessidade de debug

    // Agregar por período mensal (agrupando por período e somando totais)
    const periodMap = new Map<string, { total: number; receiptIds: Set<string> }>();
    
    expensesByPeriod?.forEach((expense) => {
      const period = expense.period_month;
      // Ignorar períodos vazios ou nulos
      if (!period || period.trim() === '') {
        console.warn('Período vazio encontrado:', expense);
        return;
      }
      
      let existing = periodMap.get(period);
      if (!existing) {
        existing = { total: 0, receiptIds: new Set<string>() };
        periodMap.set(period, existing);
      }
      
      // Adicionar ao total e ao Set de receipt IDs
      existing.total += Number(expense.total_spent);
      existing.receiptIds.add(expense.receipt_id);
    });

    // Converter para array e ordenar
    const expensesByPeriodArray = Array.from(periodMap.entries())
      .map(([period, data]) => ({
        period,
        total: Number(data.total.toFixed(2)),
        receiptCount: data.receiptIds.size,
      }))
      .filter((item) => item.period) // Filtrar períodos vazios ou nulos
      .sort((a, b) => a.period.localeCompare(b.period));
    
    // Log removido para produção

    // Buscar gastos por dia (diário) do ano especificado - apenas recibos fechados
    const { data: expensesByDayRaw, error: dayError } = await supabase
      .from('user_receipt_expenses')
      .select('period_day, total_spent, receipt_id')
      .eq('user_id', user.id)
      .eq('is_closed', true)
      .like('period_day', `${year}%`); // Filtra por ano

    if (dayError) {
      console.error('Error fetching expenses by day:', dayError);
      // Não falhar a requisição, apenas logar o erro
    }

    // Agregar por dia
    const dayMap = new Map<string, { total: number; receiptIds: Set<string> }>();
    expensesByDayRaw?.forEach((expense) => {
      const day = expense.period_day;
      // Ignorar dias vazios ou nulos
      if (!day || day.trim() === '') {
        return;
      }
      
      let existing = dayMap.get(day);
      if (!existing) {
        existing = { total: 0, receiptIds: new Set<string>() };
        dayMap.set(day, existing);
      }
      
      existing.total += Number(expense.total_spent);
      existing.receiptIds.add(expense.receipt_id);
    });

    // Converter para array e ordenar
    const expensesByDayArray = Array.from(dayMap.entries())
      .map(([day, data]) => ({
        day,
        total: Number(data.total.toFixed(2)),
        receiptCount: data.receiptIds.size,
      }))
      .filter((item) => item.day) // Filtrar dias vazios ou nulos
      .sort((a, b) => a.day.localeCompare(b.day));

    // Buscar distribuição de gastos (por recibo) - apenas recibos fechados
    const { data: expenseDistribution, error: distributionError } = await supabase
      .from('user_receipt_expenses')
      .select('receipt_id, receipt_title, receipt_date, total_spent, is_closed')
      .eq('user_id', user.id)
      .eq('is_closed', true)
      .order('receipt_date', { ascending: false });

    if (distributionError) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Erro ao buscar distribuição de gastos' },
        { status: 500 }
      );
    }

    // Agregar por recibo (caso o usuário tenha múltiplos participantes no mesmo recibo)
    const receiptMap = new Map<string, {
      receiptId: string;
      receiptTitle: string;
      receiptDate: string;
      totalSpent: number;
      isClosed: boolean;
    }>();

    expenseDistribution?.forEach((expense) => {
      const receiptId = expense.receipt_id;
      const existing = receiptMap.get(receiptId);
      
      if (existing) {
        // Se já existe, somar o total
        receiptMap.set(receiptId, {
          ...existing,
          totalSpent: existing.totalSpent + Number(expense.total_spent),
        });
      } else {
        // Primeira ocorrência deste recibo
        receiptMap.set(receiptId, {
          receiptId: expense.receipt_id,
          receiptTitle: expense.receipt_title,
          receiptDate: expense.receipt_date,
          totalSpent: Number(expense.total_spent),
          isClosed: expense.is_closed,
        });
      }
    });

    // Converter para array
    const expenseDistributionArray = Array.from(receiptMap.values())
      .map((receipt) => ({
        receiptId: receipt.receiptId,
        receiptTitle: receipt.receiptTitle,
        receiptDate: receipt.receiptDate,
        totalSpent: Number(receipt.totalSpent.toFixed(2)),
        isClosed: receipt.isClosed,
      }))
      .sort((a, b) => new Date(b.receiptDate).getTime() - new Date(a.receiptDate).getTime());

    return NextResponse.json({
      expensesByPeriod: expensesByPeriodArray,
      expensesByDay: expensesByDayArray,
      expenseDistribution: expenseDistributionArray,
    }, { headers });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}
