-- Adicionar campos do Stripe na tabela plans
ALTER TABLE plans
ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255);

-- Adicionar campos do Stripe na tabela user_subscriptions
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription_id 
ON user_subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer_id 
ON user_subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_plans_stripe_price_id 
ON plans(stripe_price_id);

-- Comentários para documentação
COMMENT ON COLUMN plans.stripe_price_id IS 'ID do preço (price) no Stripe associado a este plano';
COMMENT ON COLUMN user_subscriptions.stripe_subscription_id IS 'ID da assinatura no Stripe';
COMMENT ON COLUMN user_subscriptions.stripe_customer_id IS 'ID do cliente no Stripe';
