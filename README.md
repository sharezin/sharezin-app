# Sharezin - Sistema de Divisão de Recibos

Sharezin é uma aplicação web moderna para gerenciar recibos compartilhados e calcular automaticamente quanto cada pessoa deve pagar. Ideal para dividir contas de restaurantes, bares e eventos em grupo.

## 📋 Sobre o Projeto

O Sharezin permite que grupos de pessoas criem recibos compartilhados, adicionem produtos/items consumidos e calcule automaticamente a divisão justa considerando:
- **Itens individuais**: Cada pessoa paga pelos produtos que consumiu
- **Taxa de serviço**: Dividida proporcionalmente ao consumo de cada um
- **Cover/Couvert**: Dividido igualmente entre todos os participantes

## ✨ Funcionalidades Principais

- 🔐 **Autenticação completa**: Login, registro e gerenciamento de perfil
- 📝 **Criação de recibos**: Crie recibos com título, taxa de serviço e cover
- 👥 **Gerenciamento de participantes**: 
  - Adicione participantes via código de convite
  - Aprove/rejeite solicitações de participação
  - Feche participações individuais
- 🛒 **Adição de produtos**: Cada participante pode adicionar produtos que consumiu
- 🗑️ **Sistema de solicitações**: Participantes podem solicitar exclusão de seus produtos (aprovado pelo criador)
- 💰 **Cálculo automático**: Divisão proporcional e igual dos valores
- 📊 **Visualização de totais**: Veja quanto cada pessoa deve pagar
- 📱 **Interface mobile-first**: Design responsivo e otimizado para dispositivos móveis
- 🔄 **Pull-to-refresh**: Atualize os dados deslizando para baixo
- 🌙 **Dark mode**: Suporte a tema escuro
- 📄 **Geração de PDF**: Exporte recibos em PDF

## 🛠️ Stack Tecnológica

- **Framework**: Next.js 16 (App Router)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS
- **Backend/Database**: Supabase (PostgreSQL)
- **Autenticação**: JWT (JSON Web Tokens) com bcryptjs
- **Bibliotecas**:
  - jsPDF para geração de PDFs
  - @supabase/supabase-js para integração com banco de dados

## 📁 Estrutura do Projeto

```
sharezin/front/
├── app/                          # Rotas Next.js (App Router)
│   ├── api/                      # API Routes (Backend)
│   │   ├── auth/                 # Rotas de autenticação
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── me/
│   │   │   └── change-password/
│   │   └── receipts/             # Rotas de recibos
│   │       ├── [id]/             # Operações em recibo específico
│   │       │   ├── close/        # Fechar recibo
│   │       │   ├── participants/ # Gerenciar participantes
│   │       │   └── route.ts       # GET, PUT, DELETE
│   │       ├── invite/           # Sistema de convites
│   │       └── route.ts          # GET (listar), POST (criar)
│   ├── groups/                   # Página de grupos
│   ├── history/                  # Histórico de recibos fechados
│   ├── login/                    # Página de login
│   ├── profile/                  # Perfil do usuário
│   ├── receipt/                 # Páginas de recibos
│   │   ├── [id]/                # Detalhes do recibo
│   │   └── new/                 # Criar novo recibo
│   ├── layout.tsx               # Layout raiz
│   └── page.tsx                 # Página inicial (home)
│
├── components/                   # Componentes React reutilizáveis
│   ├── forms/                   # Componentes de formulário
│   │   ├── CurrencyInput.tsx
│   │   └── NumberInput.tsx
│   ├── receipt/                 # Componentes específicos de recibos
│   │   ├── ReceiptHeader.tsx
│   │   ├── ReceiptTabs.tsx
│   │   ├── ReceiptTotalCard.tsx
│   │   └── ...
│   ├── ui/                      # Componentes de UI genéricos
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── ReceiptCard.tsx
│   │   └── ...
│   ├── BottomNav.tsx            # Navegação inferior
│   ├── Modal.tsx                # Modais reutilizáveis
│   ├── ProductForm.tsx          # Formulário de produtos
│   └── RouteGuard.tsx           # Proteção de rotas
│
├── contexts/                     # Contextos React
│   └── AuthContext.tsx          # Contexto de autenticação
│
├── hooks/                       # Custom Hooks
│   ├── useAuth.ts               # Hook de autenticação
│   ├── useReceipts.ts           # Hook de gerenciamento de recibos
│   ├── useCalculations.ts       # Hook de cálculos
│   ├── useGroups.ts             # Hook de grupos
│   ├── useReceiptPermissions.ts  # Hook de permissões
│   └── usePullToRefresh.ts      # Hook de pull-to-refresh
│
├── lib/                         # Utilitários e serviços
│   ├── api.ts                   # Funções de requisição HTTP
│   ├── auth.ts                  # Utilitários de autenticação
│   ├── calculations.ts          # Funções de cálculo
│   ├── supabase.ts             # Cliente Supabase
│   ├── storage.ts              # Gerenciamento de storage
│   ├── utils.ts                # Utilitários gerais
│   ├── services/               # Serviços de negócio
│   │   ├── authService.ts       # Serviço de autenticação
│   │   ├── receiptService.ts   # Serviço de recibos
│   │   ├── receiptDataService.ts # Busca de dados de recibos
│   │   ├── receiptPermissionService.ts # Verificação de permissões
│   │   └── pdfService.ts       # Geração de PDFs
│   └── transformers/           # Transformadores de dados
│       └── receiptTransformer.ts # Transformação API ↔ Frontend
│
└── types/                       # Definições TypeScript
    ├── index.ts                # Tipos principais
    └── supabase.ts             # Tipos do Supabase
```

## 🏗️ Arquitetura e Organização

### Camadas da Aplicação

1. **Camada de Apresentação** (`app/`, `components/`)
   - Páginas e componentes React
   - Interface do usuário e interações

2. **Camada de Lógica de Negócio** (`hooks/`, `lib/services/`)
   - Custom hooks para lógica reutilizável
   - Serviços que encapsulam regras de negócio

3. **Camada de Dados** (`lib/api.ts`, `lib/supabase.ts`)
   - Comunicação com API
   - Transformação de dados (snake_case ↔ camelCase)

4. **Camada de Autenticação** (`contexts/AuthContext.tsx`, `lib/auth.ts`)
   - Gerenciamento de sessão
   - Proteção de rotas

### Fluxo de Dados

```
Componente → Hook → API Route → Service → Supabase → Database
                ↓
         Transformação de dados
                ↓
         Retorno ao componente
```

## 🔑 Conceitos Principais

### Recibos (Receipts)
- **Criador**: Usuário que criou o recibo (tem permissões totais)
- **Participantes**: Usuários que participam do recibo
- **Status**: Aberto (permite adições) ou Fechado (somente leitura)
- **Participação Fechada**: Participante que não pode mais adicionar produtos

### Sistema de Permissões
- **Criador pode**:
  - Fechar o recibo
  - Aprovar/rejeitar solicitações de participação
  - Aprovar/rejeitar solicitações de exclusão de produtos
  - Remover participantes
  - Fechar participações de outros participantes
  
- **Participante pode**:
  - Adicionar produtos
  - Solicitar exclusão de seus próprios produtos
  - Fechar sua própria participação
  - Visualizar totais

### Cálculos
- **Total por participante** = 
  - Itens consumidos +
  - Taxa de serviço (proporcional ao consumo) +
  - Cover (dividido igualmente)

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ 
- npm, yarn, pnpm ou bun
- Conta no Supabase (para banco de dados)

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/SkDudu/sharezin.git
cd sharezin/front
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
Crie um arquivo `.env.local` na raiz do projeto:
```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_do_supabase
JWT_SECRET=seu_secret_jwt
```

4. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

5. Abra [http://localhost:3000](http://localhost:3000) no navegador

### Scripts Disponíveis

```bash
npm run dev      # Inicia servidor de desenvolvimento
npm run build    # Cria build de produção
npm run start    # Inicia servidor de produção
npm run lint     # Executa o linter
```

## 📝 Notas de Desenvolvimento

- **Transformação de dados**: A API retorna dados em `snake_case`, mas o frontend usa `camelCase`. A transformação é feita automaticamente via `transformToCamelCase` e `transformToSnakeCase`.

- **Pull-to-refresh**: Implementado para melhorar a experiência mobile, permitindo atualizar dados deslizando para baixo.

- **Dynamic imports**: Alguns componentes são carregados dinamicamente para melhorar performance inicial.

## 📄 Licença

Este projeto é privado e de uso pessoal.

---

Desenvolvido com ❤️ usando Next.js e Supabase
