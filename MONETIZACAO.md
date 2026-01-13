# 💰 Modelos de Monetização - Sharezin
## Baseado na Análise do Banco de Dados

Este documento apresenta estratégias de monetização para o Sharezin, formuladas com base na estrutura real do banco de dados Supabase.

---

## 📊 Análise do Banco de Dados Atual

### Tabelas Existentes

#### Tabelas Principais
1. **`sharezin_users`** - Usuários do sistema
   - Campos: `id`, `email`, `name`, `password_hash`, `created_at`, `updated_at`
   - **Sem campo de plano/assinatura atualmente**

2. **`receipts`** - Recibos principais
   - Campos: `id`, `title`, `date`, `creator_id`, `invite_code`, `service_charge_percent`, `cover`, `total`, `is_closed`, `created_at`, `updated_at`
   - **Sem limite de recibos por usuário atualmente**

3. **`participants`** - Participantes
   - Campos: `id`, `name`, `user_id`, `group_id`, `is_closed`, `created_at`, `updated_at`
   - **Sem limite de participantes por recibo atualmente**

4. **`receipt_participants`** - Relação recibos ↔ participantes
   - Campos: `id`, `receipt_id`, `participant_id`, `created_at`
   - **Permite relacionar participantes aos recibos**

5. **`receipt_items`** - Itens/produtos dos recibos
   - Campos: `id`, `name`, `price`, `quantity`, `participant_id`, `receipt_id`, `added_at`, `created_at`, `updated_at`
   - **Sem limite de itens atualmente**

6. **`pending_participants`** - Participantes pendentes
   - Campos: `id`, `name`, `user_id`, `receipt_id`, `requested_at`, `created_at`
   - **Sistema de aprovação já implementado**

7. **`deletion_requests`** - Solicitações de exclusão
   - Campos: `id`, `item_id`, `participant_id`, `receipt_id`, `requested_at`, `created_at`
   - **Sistema de solicitações já implementado**

8. **`groups`** - Grupos de participantes
   - Campos: `id`, `name`, `user_id`, `created_at`, `updated_at`
   - **Grupos já existem, podem ser premium**

9. **`notifications`** - Notificações
   - Campos: `id`, `user_id`, `type`, `title`, `message`, `receipt_id`, `related_user_id`, `is_read`, `created_at`, `updated_at`
   - **Realtime pode ser premium**

10. **`user_receipt_expenses`** - Gastos calculados por usuário
    - Campos: `id`, `user_id`, `receipt_id`, `participant_id`, `items_total`, `service_charge_amount`, `cover_amount`, `total_spent`, `is_closed`, `period_day`, `period_month`, `receipt_date`, `receipt_title`, `calculated_at`, `updated_at`
    - **View materializada para analytics - pode ser premium**

### Funções do Banco
- `calculate_user_receipt_expense(p_participant_id, p_receipt_id)` - Calcula gastos
- `recalculate_receipt_expenses(p_receipt_id)` - Recalcula gastos
- `upsert_user_receipt_expense(p_participant_id, p_receipt_id)` - Atualiza gastos

---

## 🗄️ Migração SQL Necessária

### 1. Tabela de Planos

```sql
-- Tabela de planos disponíveis
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE, -- 'free', 'premium', 'pro'
  display_name VARCHAR(100) NOT NULL,
  price_monthly DECIMAL(10, 2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10, 2),
  features JSONB NOT NULL DEFAULT '{}', -- Features em JSON
  limits JSONB NOT NULL DEFAULT '{}', -- Limites em JSON
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir planos padrão
INSERT INTO subscription_plans (name, display_name, price_monthly, price_yearly, features, limits) VALUES
('free', 'Gratuito', 0, 0, 
 '{"receipts": true, "participants": true, "items": true, "calculations": true, "basic_notifications": true, "dark_mode": true}',
 '{"max_receipts_per_month": 5, "max_participants_per_receipt": 5, "max_history_receipts": 10, "pdf_export": false, "analytics": false, "realtime_notifications": false, "groups": false}'),
('premium', 'Premium', 9.90, 99.90,
 '{"receipts": true, "participants": true, "items": true, "calculations": true, "basic_notifications": true, "realtime_notifications": true, "dark_mode": true, "pdf_export": true, "analytics": true, "groups": true}',
 '{"max_receipts_per_month": -1, "max_participants_per_receipt": -1, "max_history_receipts": -1, "pdf_export": true, "analytics": true, "realtime_notifications": true, "groups": true}'),
('pro', 'Pro', 19.90, 199.90,
 '{"receipts": true, "participants": true, "items": true, "calculations": true, "basic_notifications": true, "realtime_notifications": true, "dark_mode": true, "pdf_export": true, "analytics": true, "groups": true, "api_access": true, "export_csv": true, "templates": true, "multiple_admins": true}',
 '{"max_receipts_per_month": -1, "max_participants_per_receipt": -1, "max_history_receipts": -1, "pdf_export": true, "analytics": true, "realtime_notifications": true, "groups": true, "api_access": true, "export_csv": true, "templates": true, "multiple_admins": true}');
```

### 2. Tabela de Assinaturas

```sql
-- Tabela de assinaturas dos usuários
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES sharezin_users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired', 'trial'
  billing_cycle VARCHAR(10) NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  stripe_subscription_id VARCHAR(255), -- ID da assinatura no Stripe
  stripe_customer_id VARCHAR(255), -- ID do cliente no Stripe
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, status) WHERE status = 'active' -- Um usuário só pode ter uma assinatura ativa
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires_at ON user_subscriptions(expires_at);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_user_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_subscriptions_updated_at();
```

### 3. Tabela de Uso (Tracking)

```sql
-- Tabela para rastrear uso e aplicar limites
CREATE TABLE IF NOT EXISTS user_usage_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES sharezin_users(id) ON DELETE CASCADE,
  period_month VARCHAR(7) NOT NULL, -- Formato: 'YYYY-MM'
  receipts_created INTEGER DEFAULT 0,
  receipts_active INTEGER DEFAULT 0,
  max_participants_in_receipt INTEGER DEFAULT 0,
  pdf_exports INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, period_month)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_usage_stats_user_id ON user_usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_stats_period ON user_usage_stats(period_month);
```

### 4. Funções Helper

```sql
-- Função para obter plano atual do usuário
CREATE OR REPLACE FUNCTION get_user_plan(p_user_id UUID)
RETURNS TABLE (
  plan_name VARCHAR(50),
  plan_id UUID,
  status VARCHAR(20),
  features JSONB,
  limits JSONB,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.name,
    sp.id,
    us.status,
    sp.features,
    sp.limits,
    us.expires_at
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = p_user_id
    AND us.status = 'active'
    AND (us.expires_at IS NULL OR us.expires_at > NOW())
  ORDER BY us.created_at DESC
  LIMIT 1;
  
  -- Se não encontrou assinatura ativa, retorna plano free
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      'free'::VARCHAR(50),
      sp.id,
      'active'::VARCHAR(20),
      sp.features,
      sp.limits,
      NULL::TIMESTAMP WITH TIME ZONE
    FROM subscription_plans sp
    WHERE sp.name = 'free'
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar se usuário pode criar recibo
CREATE OR REPLACE FUNCTION can_create_receipt(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan_limits JSONB;
  v_max_receipts INTEGER;
  v_current_month VARCHAR(7);
  v_receipts_created INTEGER;
BEGIN
  -- Obter limites do plano
  SELECT limits INTO v_plan_limits
  FROM get_user_plan(p_user_id);
  
  v_max_receipts := (v_plan_limits->>'max_receipts_per_month')::INTEGER;
  
  -- Se ilimitado (-1), permite
  IF v_max_receipts = -1 THEN
    RETURN TRUE;
  END IF;
  
  -- Obter mês atual
  v_current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Contar recibos criados no mês
  SELECT COALESCE(receipts_created, 0) INTO v_receipts_created
  FROM user_usage_stats
  WHERE user_id = p_user_id AND period_month = v_current_month;
  
  -- Verificar se pode criar
  RETURN v_receipts_created < v_max_receipts;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar limite de participantes
CREATE OR REPLACE FUNCTION can_add_participant(p_user_id UUID, p_receipt_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan_limits JSONB;
  v_max_participants INTEGER;
  v_current_participants INTEGER;
BEGIN
  -- Obter limites do plano
  SELECT limits INTO v_plan_limits
  FROM get_user_plan(p_user_id);
  
  v_max_participants := (v_plan_limits->>'max_participants_per_receipt')::INTEGER;
  
  -- Se ilimitado (-1), permite
  IF v_max_participants = -1 THEN
    RETURN TRUE;
  END IF;
  
  -- Contar participantes atuais do recibo
  SELECT COUNT(*) INTO v_current_participants
  FROM receipt_participants
  WHERE receipt_id = p_receipt_id;
  
  -- Verificar se pode adicionar
  RETURN v_current_participants < v_max_participants;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar estatísticas de uso
CREATE OR REPLACE FUNCTION update_usage_stats(
  p_user_id UUID,
  p_action VARCHAR(50) -- 'receipt_created', 'participant_added', 'pdf_exported'
)
RETURNS VOID AS $$
DECLARE
  v_current_month VARCHAR(7);
BEGIN
  v_current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  INSERT INTO user_usage_stats (user_id, period_month, receipts_created, receipts_active)
  VALUES (p_user_id, v_current_month, 0, 0)
  ON CONFLICT (user_id, period_month) DO NOTHING;
  
  IF p_action = 'receipt_created' THEN
    UPDATE user_usage_stats
    SET receipts_created = receipts_created + 1,
        receipts_active = receipts_active + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id AND period_month = v_current_month;
  ELSIF p_action = 'receipt_closed' THEN
    UPDATE user_usage_stats
    SET receipts_active = GREATEST(0, receipts_active - 1),
        updated_at = NOW()
    WHERE user_id = p_user_id AND period_month = v_current_month;
  ELSIF p_action = 'pdf_exported' THEN
    UPDATE user_usage_stats
    SET pdf_exports = pdf_exports + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id AND period_month = v_current_month;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

---

## 💎 Estratégia de Monetização Baseada no Banco

### Plano Gratuito

**Limites (aplicados via `user_usage_stats` e funções):**
- ✅ **5 recibos por mês** (contado via `receipts.created_at`)
- ✅ **5 participantes por recibo** (contado via `receipt_participants`)
- ✅ **Últimos 10 recibos fechados** no histórico (filtro na query)
- ✅ Funcionalidades básicas:
  - Criar e gerenciar recibos
  - Adicionar itens (`receipt_items`)
  - Cálculos automáticos (funções existentes)
  - Notificações básicas (polling, não Realtime)
  - Dark mode

**Restrições:**
- ❌ Sem geração de PDF
- ❌ Sem analytics/gráficos (bloquear acesso a `user_receipt_expenses` para analytics)
- ❌ Sem notificações Realtime
- ❌ Sem grupos permanentes (bloquear criação em `groups`)

---

### Plano Premium (R$ 9,90/mês)

**Limites:**
- ✅ **Recibos ilimitados** (`max_receipts_per_month: -1`)
- ✅ **Participantes ilimitados** (`max_participants_per_receipt: -1`)
- ✅ **Histórico completo** (`max_history_receipts: -1`)

**Funcionalidades Premium:**
- ✅ **Geração de PDF** (já implementado em `lib/services/pdfService.ts`)
- ✅ **Analytics e gráficos** (acesso completo a `user_receipt_expenses`)
- ✅ **Notificações Realtime** (Supabase Realtime já implementado)
- ✅ **Grupos permanentes** (criação ilimitada em `groups`)

---

### Plano Pro (R$ 19,90/mês)

**Tudo do Premium +**
- ✅ **Exportação CSV/Excel** (novo)
- ✅ **API Access** (novo endpoint)
- ✅ **Templates de recibos** (nova tabela `receipt_templates`)
- ✅ **Múltiplos administradores** (nova tabela `receipt_admins`)
- ✅ **Categorização de gastos** (nova coluna em `receipt_items`: `category_id`)

---

## 🔧 Implementação Técnica

### 1. Middleware de Verificação de Plano

```typescript
// lib/services/subscriptionService.ts
import { createServerClient } from '@/lib/supabase';

export async function getUserPlan(userId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase.rpc('get_user_plan', {
    p_user_id: userId
  });
  
  if (error || !data || data.length === 0) {
    // Retorna plano free por padrão
    return {
      plan_name: 'free',
      features: { /* features free */ },
      limits: { max_receipts_per_month: 5, max_participants_per_receipt: 5 }
    };
  }
  
  return data[0];
}

export async function canCreateReceipt(userId: string): Promise<boolean> {
  const supabase = createServerClient();
  const { data, error } = await supabase.rpc('can_create_receipt', {
    p_user_id: userId
  });
  
  return data ?? false;
}

export async function canAddParticipant(userId: string, receiptId: string): Promise<boolean> {
  const supabase = createServerClient();
  const { data, error } = await supabase.rpc('can_add_participant', {
    p_user_id: userId,
    p_receipt_id: receiptId
  });
  
  return data ?? false;
}
```

### 2. Validações nas API Routes

```typescript
// app/api/receipts/route.ts (POST)
import { canCreateReceipt, updateUsageStats } from '@/lib/services/subscriptionService';

export async function POST(request: NextRequest) {
  // ... autenticação ...
  
  // Verificar se pode criar recibo
  const canCreate = await canCreateReceipt(user.id);
  if (!canCreate) {
    return NextResponse.json(
      { error: 'Limite de recibos atingido. Faça upgrade para Premium.' },
      { status: 403 }
    );
  }
  
  // Criar recibo...
  const receipt = await createReceipt(/* ... */);
  
  // Atualizar estatísticas
  await updateUsageStats(user.id, 'receipt_created');
  
  return NextResponse.json(receipt);
}
```

### 3. Bloqueio de Funcionalidades Premium

```typescript
// app/api/receipts/[id]/export-pdf/route.ts
import { getUserPlan } from '@/lib/services/subscriptionService';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  // ... autenticação ...
  
  const plan = await getUserPlan(user.id);
  const canExportPDF = plan.features?.pdf_export === true;
  
  if (!canExportPDF) {
    return NextResponse.json(
      { error: 'Geração de PDF disponível apenas no plano Premium.' },
      { status: 403 }
    );
  }
  
  // Gerar PDF...
}
```

---

## 📊 Matriz de Funcionalidades por Plano

| Funcionalidade | Tabela/Feature | Gratuito | Premium | Pro |
|---------------|----------------|----------|---------|-----|
| **Limites** |
| Recibos/mês | `receipts` | 5 | Ilimitado | Ilimitado |
| Participantes/recibo | `receipt_participants` | 5 | Ilimitado | Ilimitado |
| Histórico | `receipts.is_closed` | 10 | Ilimitado | Ilimitado |
| **Recibos** |
| Criar recibo | `receipts` | ✅ | ✅ | ✅ |
| Adicionar itens | `receipt_items` | ✅ | ✅ | ✅ |
| Cálculos | Funções DB | ✅ | ✅ | ✅ |
| **Exportação** |
| PDF | `pdfService.ts` | ❌ | ✅ | ✅ |
| CSV/Excel | Novo | ❌ | ❌ | ✅ |
| **Analytics** |
| Dashboard básico | `user_receipt_expenses` | ✅ | ✅ | ✅ |
| Gráficos | `user_receipt_expenses` | ❌ | ✅ | ✅ |
| **Notificações** |
| Básicas (polling) | `notifications` | ✅ | ✅ | ✅ |
| Realtime | Supabase Realtime | ❌ | ✅ | ✅ |
| **Grupos** |
| Grupos temporários | `groups` | ✅ | ✅ | ✅ |
| Grupos permanentes | `groups` | ❌ | ✅ | ✅ |
| **Colaboração** |
| Templates | Nova tabela | ❌ | ❌ | ✅ |
| Múltiplos admins | Nova tabela | ❌ | ❌ | ✅ |
| Categorização | `receipt_items.category_id` | ❌ | ❌ | ✅ |

---

## 🚀 Roadmap de Implementação

### Fase 1: Estrutura Base (Semana 1-2)
1. ✅ Executar migrações SQL (tabelas de planos e assinaturas)
2. ✅ Criar funções helper no banco
3. ✅ Implementar `subscriptionService.ts`
4. ✅ Adicionar validações nas APIs existentes

### Fase 2: Limites e Bloqueios (Semana 3-4)
1. ✅ Implementar contadores de uso
2. ✅ Adicionar validações de limites
3. ✅ Criar modais de upgrade
4. ✅ Adicionar badges de plano

### Fase 3: Gateway de Pagamento (Semana 5-6)
1. ✅ Integrar Stripe ou Mercado Pago
2. ✅ Criar página de preços
3. ✅ Implementar webhooks de pagamento
4. ✅ Sistema de renovação automática

### Fase 4: Analytics e Premium Features (Semana 7-8)
1. ✅ Bloquear analytics para free
2. ✅ Bloquear PDF para free
3. ✅ Bloquear Realtime para free
4. ✅ Testes e ajustes

---

## 📈 Métricas e Tracking

### Queries Úteis para Analytics

```sql
-- Usuários por plano
SELECT 
  sp.name as plan_name,
  COUNT(DISTINCT us.user_id) as user_count
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active'
GROUP BY sp.name;

-- Taxa de conversão (free → premium)
SELECT 
  COUNT(DISTINCT CASE WHEN sp.name != 'free' THEN us.user_id END) * 100.0 / 
  COUNT(DISTINCT us.user_id) as conversion_rate
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active';

-- Uso médio por plano
SELECT 
  sp.name,
  AVG(uus.receipts_created) as avg_receipts,
  AVG(uus.max_participants_in_receipt) as avg_participants
FROM user_usage_stats uus
JOIN user_subscriptions us ON uus.user_id = us.user_id
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active'
GROUP BY sp.name;
```

---

**Última atualização:** Dezembro 2024  
**Versão:** 2.0 (Baseado na estrutura real do banco)  
**Banco de dados:** Supabase PostgreSQL
