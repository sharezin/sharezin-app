import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, createAuthResponse } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';

// GET /api/receipts/dashboard-stats - Buscar estatísticas do dashboard
export async function GET(request: NextRequest) {
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
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Erro ao buscar gastos por período' },
        { status: 500 }
      );
    }

    // Agregar por período mensal (agrupando por período e somando totais)
    const periodMap = new Map<string, { total: number; receiptIds: Set<string> }>();
    
    expensesByPeriod?.forEach((expense) => {
      const period = expense.period_month;
      const existing = periodMap.get(period) || { total: 0, receiptIds: new Set<string>() };
      periodMap.set(period, {
        total: existing.total + Number(expense.total_spent),
        receiptIds: existing.receiptIds.add(expense.receipt_id),
      });
    });

    // Converter para array e ordenar
    const expensesByPeriodArray = Array.from(periodMap.entries())
      .map(([period, data]) => ({
        period,
        total: Number(data.total.toFixed(2)),
        receiptCount: data.receiptIds.size,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

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
      expenseDistribution: expenseDistributionArray,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}
