import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, createAuthResponse } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import { checkReceiptAccess } from '@/lib/services/receiptPermissionService';
import { fetchReceiptData, getReceiptParticipantsWithUserId } from '@/lib/services/receiptDataService';
import { upsertReceiptParticipants, upsertPendingParticipants, upsertDeletionRequests, upsertReceiptItems } from '@/lib/services/receiptService';
import { createNotification } from '@/lib/services/notificationService';

// GET /api/receipts/[id] - Buscar recibo por ID
// Assinatura compatível com tipos do Next.js/Turbopack no build da Vercel
export async function GET(
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

    // Buscar recibo
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .single();

    if (receiptError || !receipt) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Recibo não encontrado' },
        { status: 404 }
      );
    }

    // Verificar permissão
    const permission = await checkReceiptAccess(supabase, receiptId, user.id);
    
    if (!permission.hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão para acessar este recibo' },
        { status: 403 }
      );
    }

    // Buscar dados relacionados
    const receiptData = await fetchReceiptData(supabase, receiptId);

    return NextResponse.json({
      receipt: {
        ...receipt,
        items: receiptData.items,
        participants: receiptData.participants,
        pending_participants: receiptData.pendingParticipants,
        deletion_requests: receiptData.deletionRequests,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}

// PUT /api/receipts/[id] - Atualizar recibo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const user = await getAuthUser(request);
  if (!user) {
    return createAuthResponse('Não autenticado');
  }

  try {
    const body = await request.json();
    const supabase = createServerClient();
    const receiptId = resolvedParams.id;

    // Verificar se é o criador ou participante
    const { data: receipt } = await supabase
      .from('receipts')
      .select('creator_id, is_closed')
      .eq('id', receiptId)
      .single();

    if (!receipt) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Recibo não encontrado' },
        { status: 404 }
      );
    }

    // Verificar permissão
    const permission = await checkReceiptAccess(supabase, receiptId, user.id);

    if (!permission.hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sem permissão para atualizar este recibo' },
        { status: 403 }
      );
    }

    // Verificar se o recibo está fechado
    if (receipt.is_closed && !permission.isCreator) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Não é possível adicionar produtos a um recibo fechado' },
        { status: 403 }
      );
    }

    // Apenas o criador pode modificar campos do recibo (título, taxa, cover, fechar, etc.)
    // Participantes só podem adicionar itens
    const canModifyReceipt = permission.isCreator;

    // Atualizar recibo (apenas criador pode modificar campos do recibo)
    const updateData: {
      updated_at: string;
      title?: string;
      service_charge_percent?: number;
      cover?: number;
      is_closed?: boolean;
      total?: number;
    } = {
      updated_at: new Date().toISOString(),
    };

    // Apenas o criador pode modificar campos do recibo
    if (canModifyReceipt) {
      if (body.title !== undefined) updateData.title = body.title;
      if (body.serviceChargePercent !== undefined) updateData.service_charge_percent = body.serviceChargePercent;
      if (body.cover !== undefined) updateData.cover = body.cover;
      if (body.isClosed !== undefined) updateData.is_closed = body.isClosed;
      if (body.total !== undefined) updateData.total = body.total;
    } else {
      // Participantes só podem atualizar o total (calculado automaticamente)
      if (body.total !== undefined) updateData.total = body.total;
    }

    const { data: updatedReceipt, error: receiptError } = await supabase
      .from('receipts')
      .update(updateData)
      .eq('id', receiptId)
      .select()
      .single();

    if (receiptError) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Erro ao atualizar recibo' },
        { status: 500 }
      );
    }

    // Salvar dados relacionados se fornecidos
    if (body.participants !== undefined && Array.isArray(body.participants)) {
      await upsertReceiptParticipants(supabase, receiptId, body.participants);
    }

    if (body.pendingParticipants !== undefined && Array.isArray(body.pendingParticipants)) {
      await upsertPendingParticipants(supabase, receiptId, body.pendingParticipants);
    }

    if (body.deletionRequests !== undefined && Array.isArray(body.deletionRequests)) {
      await upsertDeletionRequests(supabase, receiptId, body.deletionRequests);
    }

    // Processar itens e detectar novos itens adicionados
    let newItems: any[] = [];
    if (body.items !== undefined && Array.isArray(body.items)) {
      const result = await upsertReceiptItems(supabase, receiptId, body.items);
      newItems = result.newItems;
      
      // Se houver novos itens, criar notificações para os participantes
      if (newItems.length > 0) {
        try {
          // Buscar informações do recibo e do usuário atual
          const { data: receiptInfo } = await supabase
            .from('receipts')
            .select('title')
            .eq('id', receiptId)
            .single();
          
          const { data: currentUser } = await supabase
            .from('sharezin_users')
            .select('name')
            .eq('id', user.id)
            .single();
          
          // Buscar todos os participantes do recibo com user_id
          const participantUserIds = await getReceiptParticipantsWithUserId(supabase, receiptId);
          
          // Filtrar para excluir o usuário que adicionou o item
          const userIdsToNotify = participantUserIds.filter(userId => userId !== user.id);
          
          // Criar notificações para cada novo item
          for (const newItem of newItems) {
            const notificationPromises = userIdsToNotify.map(userId =>
              createNotification(supabase, {
                userId,
                type: 'item_added',
                title: 'Novo item adicionado',
                message: `${currentUser?.name || 'Alguém'} adicionou ${newItem.name} ao recibo ${receiptInfo?.title || 'recibo'}`,
                receiptId: receiptId,
                relatedUserId: user.id,
              })
            );
            
            await Promise.all(notificationPromises);
          }
        } catch (error) {
          // Não falhar a operação principal se as notificações falharem
        }
      }
    }

    // Buscar dados atualizados para retornar
    const receiptData = await fetchReceiptData(supabase, receiptId);

    return NextResponse.json({
      receipt: {
        ...updatedReceipt,
        items: receiptData.items,
        participants: receiptData.participants,
        pending_participants: receiptData.pendingParticipants,
        deletion_requests: receiptData.deletionRequests,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}

// DELETE /api/receipts/[id] - Excluir recibo
export async function DELETE(
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
        { error: 'Forbidden', message: 'Apenas o criador pode excluir o recibo' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('receipts')
      .delete()
      .eq('id', receiptId);

    if (error) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Erro ao excluir recibo' },
        { status: 500 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}

