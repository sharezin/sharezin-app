import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, createAuthResponse } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import { getReceiptParticipantsWithUserId } from '@/lib/services/receiptDataService';

// GET /api/receipts/[id]/participants/user-ids - Buscar todos os user_ids dos participantes de um recibo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return createAuthResponse('Não autenticado');
  }

  try {
    const resolvedParams = await params;
    const supabase = createServerClient();

    const userIds = await getReceiptParticipantsWithUserId(supabase, resolvedParams.id);

    return NextResponse.json({ userIds });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}
