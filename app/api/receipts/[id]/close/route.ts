import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, createAuthResponse } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import { createNotification } from '@/lib/services/notificationService';
import { getReceiptParticipantsWithUserId } from '@/lib/services/receiptDataService';

// POST /api/receipts/[id]/close - Fechar recibo
// Assinatura compatível com tipos do Next.js/Turbopack no build da Vercel
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const user = await getAuthUser(request);
  if (!user) {
    return createAuthResponse('Não autenticado');
  }

  try {
    const supabase = createServerClient();
    const receiptId = resolvedParams.id;

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

    // Buscar título do recibo antes de fechar
    const { data: receiptData } = await supabase
      .from('receipts')
      .select('title')
      .eq('id', receiptId)
      .single();

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
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Erro ao fechar recibo' },
        { status: 500 }
      );
    }

    // Buscar todos os participantes do recibo com user_id e criar notificações
    try {
      const participantUserIds = await getReceiptParticipantsWithUserId(supabase, receiptId);
      const receiptTitle = receiptData?.title || 'Recibo';

      // Criar notificações para todos os participantes (exceto o criador)
      const notificationPromises = participantUserIds
        .filter(userId => userId !== user.id) // Excluir o criador
        .map(userId =>
          createNotification(supabase, {
            userId,
            type: 'receipt_closed',
            title: 'Recibo fechado',
            message: `O recibo ${receiptTitle} foi fechado`,
            receiptId: receiptId,
            relatedUserId: user.id,
          })
        );

      await Promise.all(notificationPromises);
    } catch (error) {
      // Não falhar a operação principal se as notificações falharem
    }

    return NextResponse.json({ receipt: updatedReceipt });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}

