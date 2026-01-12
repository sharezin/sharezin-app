-- Migration: Criar tabela de notificações
-- Execute este SQL no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES sharezin_users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  receipt_id UUID REFERENCES receipts(id) ON DELETE CASCADE,
  related_user_id UUID REFERENCES sharezin_users(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- Comentários
COMMENT ON TABLE notifications IS 'Tabela de notificações do sistema';
COMMENT ON COLUMN notifications.type IS 'Tipo da notificação: participant_request, participant_approved, participant_rejected, deletion_request, deletion_approved, deletion_rejected, receipt_closed, item_added';
COMMENT ON COLUMN notifications.receipt_id IS 'ID do recibo relacionado (opcional)';
COMMENT ON COLUMN notifications.related_user_id IS 'ID do usuário relacionado (ex: quem solicitou participação)';
