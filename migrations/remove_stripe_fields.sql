-- Remover campos do Stripe da tabela plans
ALTER TABLE plans
DROP COLUMN IF EXISTS stripe_price_id;

-- Remover campos do Stripe da tabela user_subscriptions
ALTER TABLE user_subscriptions
DROP COLUMN IF EXISTS stripe_subscription_id,
DROP COLUMN IF EXISTS stripe_customer_id;

-- Remover índices relacionados ao Stripe
DROP INDEX IF EXISTS idx_user_subscriptions_stripe_subscription_id;
DROP INDEX IF EXISTS idx_user_subscriptions_stripe_customer_id;
DROP INDEX IF EXISTS idx_plans_stripe_price_id;
