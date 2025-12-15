# Setup da API - Sharezin

## Configuração do Supabase

As tabelas já foram criadas no Supabase através da migration `create_sharezin_tables`.

### Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://frfukjvnppdpygnabfpa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui

# JWT Secret (gere uma chave segura)
JWT_SECRET=sua_chave_secreta_jwt_aqui
```

### Obter as Chaves do Supabase

1. Acesse o dashboard do Supabase: https://supabase.com/dashboard
2. Selecione o projeto
3. Vá em Settings > API
4. Copie:
   - `URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (mantenha segura!)

## Rotas Criadas

### Autenticação (Públicas)

- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro
- `GET /api/auth/me` - Informações do usuário autenticado (protegida)

### Recibos (Protegidas)

- `GET /api/receipts` - Listar recibos
- `POST /api/receipts` - Criar recibo
- `GET /api/receipts/[id]` - Buscar recibo por ID
- `PUT /api/receipts/[id]` - Atualizar recibo
- `DELETE /api/receipts/[id]` - Excluir recibo
- `GET /api/receipts/invite/[inviteCode]` - Buscar recibo por código de convite (pública)
- `POST /api/receipts/[id]/close` - Fechar recibo

## Autenticação

Todas as rotas protegidas requerem o header:
```
Authorization: Bearer {token}
```

O token é retornado nas rotas de login e register.

## Próximos Passos

Ainda precisam ser criadas:
- Rotas de itens (`/api/receipts/[id]/items`)
- Rotas de participantes (`/api/receipts/[id]/participants`)
- Rotas de grupos (`/api/groups`)
- Rotas de solicitações de exclusão

## Instalação

```bash
npm install
```

As dependências já foram adicionadas ao `package.json`.

