import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, createAuthResponse } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';

// POST /api/receipts/[id]/close - Fechar recibo
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return createAuthResponse('Não autenticado');
  }

  try {
    const supabase = createServerClient();
    const receiptId = params.id;

    // Verificar se é o criador
    const { data: receipt } = await supabase
      .from('receipts')
      .select('creator_id')
      .eq('id', receiptId)
      .single();

    if (!receipt || receipt.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Apenas o criador pode fechar o recibo' },
        { status: 403 }
      );
    }

    // Fechar recibo
    const { data: updatedReceipt, error } = await supabase
      .from('receipts')
      .update({
        is_closed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', receiptId)
      .select()
      .single();

    if (error) {
      console.error('Error closing receipt:', error);
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Erro ao fechar recibo' },
        { status: 500 }
      );
    }

    return NextResponse.json({ receipt: updatedReceipt });
  } catch (error) {
    console.error('Error in POST /api/receipts/[id]/close:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}

