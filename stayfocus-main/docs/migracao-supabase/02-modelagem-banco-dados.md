# Fase 2: Modelagem do Banco de Dados

## Objetivo

Definir e implementar um esquema de banco de dados no Supabase que atenda às necessidades do StayFocus, especialmente considerando o assistente RAG e as funcionalidades de integração com WhatsApp e pagamentos PIX.

## Raciocínio

O desenho adequado do banco de dados é crucial para o bom funcionamento do aplicativo e, principalmente, para a eficácia do assistente RAG. A estrutura precisa suportar o armazenamento de dados contextuais variados, mantendo relacionamentos claros entre entidades. Além disso, é necessário implementar políticas de segurança por linha (RLS) para garantir que os usuários só acessem seus próprios dados.

## Etapas Detalhadas

### 2.1 Definir esquema do banco de dados

A seguir, apresentamos o esquema de cada tabela com seus campos e relacionamentos:

#### Tabela `usuarios`

```sql
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE NOT NULL, -- Referência ao ID do sistema de auth do Supabase
  email TEXT UNIQUE NOT NULL,
  nome_completo TEXT NOT NULL,
  whatsapp_number TEXT,
  avatar_url TEXT,
  tipo_plano TEXT NOT NULL DEFAULT 'free' CHECK (tipo_plano IN ('free', 'premium', 'premium_plus')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para atualizar o campo updated_at automaticamente
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);
```

**Considerações:**
- O campo `auth_id` faz referência ao ID gerado pelo sistema de autenticação do Supabase
- Separamos autenticação (gerenciada pelo Supabase Auth) dos dados do usuário para maior flexibilidade
- O tipo de plano é restrito a valores específicos usando a restrição CHECK

#### Tabela `preferencias`

```sql
CREATE TABLE preferencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tema TEXT NOT NULL DEFAULT 'system' CHECK (tema IN ('light', 'dark', 'system')),
  notificacoes_email BOOLEAN NOT NULL DEFAULT true,
  notificacoes_whatsapp BOOLEAN NOT NULL DEFAULT false,
  frequencia_notificacoes TEXT NOT NULL DEFAULT 'diaria' CHECK (frequencia_notificacoes IN ('desativado', 'diaria', 'semanal')),
  configuracoes_rag JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(usuario_id)
);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON preferencias
FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);
```

**Considerações:**
- Usamos JSONB para `configuracoes_rag` para armazenar configurações flexíveis do assistente
- A restrição UNIQUE garante que cada usuário tenha apenas um registro de preferências
- A restrição ON DELETE CASCADE garante que as preferências sejam removidas se o usuário for excluído

#### Tabela `assinaturas`

```sql
CREATE TABLE assinaturas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('premium', 'premium_plus')),
  valor DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'canceled')),
  data_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_fim TIMESTAMP WITH TIME ZONE,
  referencia_pagamento TEXT,
  metadados_pagamento JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON assinaturas
FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);
```

**Considerações:**
- `metadados_pagamento` armazena dados específicos do provedor de pagamento
- O campo `data_fim` permite acompanhar expiração de assinaturas
- O sistema deve incluir uma função agendada para atualizar status de assinaturas expiradas

#### Tabela `conversas_assistente`

```sql
CREATE TABLE conversas_assistente (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  mensagem TEXT NOT NULL,
  is_usuario BOOLEAN NOT NULL DEFAULT true,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  contexto_recuperado JSONB DEFAULT NULL,
  metadados JSONB DEFAULT '{}'::jsonb
);

-- Índice para buscas por usuário e ordenação por timestamp
CREATE INDEX idx_conversas_usuario_timestamp ON conversas_assistente(usuario_id, timestamp);
```

**Considerações:**
- `contexto_recuperado` armazena quais dados contextuais foram utilizados para gerar resposta
- `metadados` pode armazenar informações adicionais como avaliação da resposta
- O índice otimiza a recuperação de histórico de conversas de um usuário

#### Tabela `dados_contextuais`

```sql
CREATE TABLE dados_contextuais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  titulo TEXT,
  conteudo JSONB NOT NULL,
  relevancia INTEGER DEFAULT 1 CHECK (relevancia BETWEEN 1 AND 10),
  embedding VECTOR(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON dados_contextuais
FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

-- Índice para buscas por usuário e tipo
CREATE INDEX idx_dados_usuario_tipo ON dados_contextuais(usuario_id, tipo);

-- Índice para busca vetorial (se pgvector estiver habilitado)
CREATE INDEX idx_dados_embedding ON dados_contextuais USING ivfflat (embedding vector_cosine_ops);
```

**Considerações:**
- `tipo` pode ser 'financas', 'hiperfocos', 'estudos', etc., classificando o tipo de dado
- `embedding` armazena representação vetorial do conteúdo (requer extensão pgvector)
- `relevancia` permite priorizar certos dados no contexto RAG
- O índice vetorial otimiza buscas semânticas para o assistente RAG

### 2.2 Criar tabelas via SQL no Supabase

As tabelas acima devem ser criadas no Editor SQL do Supabase. Importante verificar se as extensões necessárias estão habilitadas:

```sql
-- Verificar extensões disponíveis
SELECT * FROM pg_extension;

-- Habilitar extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Habilitar extensão para atualização automática de campos timestamp
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- Habilitar extensão pgvector para embeddings (opcional nesta fase)
CREATE EXTENSION IF NOT EXISTS "vector";
```

### 2.3 Configurar RLS (Row Level Security)

As políticas RLS garantem que os usuários só possam acessar seus próprios dados:

```sql
-- Habilitar RLS para todas as tabelas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversas_assistente ENABLE ROW LEVEL SECURITY;
ALTER TABLE dados_contextuais ENABLE ROW LEVEL SECURITY;

-- Política para usuários (apenas leitura do próprio perfil)
CREATE POLICY "Usuários podem ver apenas seu próprio perfil"
ON usuarios FOR SELECT
USING (auth.uid() = auth_id);

CREATE POLICY "Usuários podem atualizar apenas seu próprio perfil"
ON usuarios FOR UPDATE
USING (auth.uid() = auth_id);

-- Política para preferências
CREATE POLICY "Usuários podem ver apenas suas próprias preferências"
ON preferencias FOR SELECT
USING (auth.uid() IN (
  SELECT auth_id FROM usuarios WHERE id = usuario_id
));

CREATE POLICY "Usuários podem atualizar apenas suas próprias preferências"
ON preferencias FOR UPDATE
USING (auth.uid() IN (
  SELECT auth_id FROM usuarios WHERE id = usuario_id
));

CREATE POLICY "Usuários podem inserir apenas suas próprias preferências"
ON preferencias FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT auth_id FROM usuarios WHERE id = usuario_id
));

-- Políticas semelhantes para as outras tabelas...
```

**Considerações:**
- As políticas usam `auth.uid()` para obter o ID do usuário autenticado
- As consultas aninhadas relacionam o ID da autenticação com o ID nas tabelas
- Políticas diferentes para SELECT, INSERT, UPDATE garantem controle granular

### 2.4 Criar tipos TypeScript correspondentes

**Criar arquivo `types/database.ts`:**

```typescript
export interface Usuario {
  id: string;
  auth_id: string;
  email: string;
  nome_completo: string;
  whatsapp_number: string | null;
  avatar_url: string | null;
  tipo_plano: 'free' | 'premium' | 'premium_plus';
  created_at: string;
  updated_at: string;
}

export interface Preferencias {
  id: string;
  usuario_id: string;
  tema: 'light' | 'dark' | 'system';
  notificacoes_email: boolean;
  notificacoes_whatsapp: boolean;
  frequencia_notificacoes: 'desativado' | 'diaria' | 'semanal';
  configuracoes_rag: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Assinatura {
  id: string;
  usuario_id: string;
  tipo: 'premium' | 'premium_plus';
  valor: number;
  status: 'active' | 'expired' | 'canceled';
  data_inicio: string;
  data_fim: string | null;
  referencia_pagamento: string | null;
  metadados_pagamento: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ConversaAssistente {
  id: string;
  usuario_id: string;
  mensagem: string;
  is_usuario: boolean;
  timestamp: string;
  contexto_recuperado: Record<string, any> | null;
  metadados: Record<string, any>;
}

export interface DadoContextual {
  id: string;
  usuario_id: string;
  tipo: string;
  titulo: string | null;
  conteudo: Record<string, any>;
  relevancia: number;
  embedding?: number[]; // Opcional, pois não é sempre retornado em queries
  created_at: string;
  updated_at: string;
}

// Tipo de banco de dados completo
export interface Database {
  usuarios: Usuario[];
  preferencias: Preferencias[];
  assinaturas: Assinatura[];
  conversas_assistente: ConversaAssistente[];
  dados_contextuais: DadoContextual[];
}
```

**Considerações:**
- Os tipos refletem exatamente a estrutura do banco de dados
- Campos timestamp são representados como string (formato ISO)
- Campos JSONB são tipados como `Record<string, any>` para flexibilidade

## Verificação da Fase

A fase 2 está concluída quando:

- [x] Todas as tabelas estão criadas no Supabase
- [x] Extensões necessárias estão habilitadas
- [x] Políticas RLS estão configuradas e testadas
- [x] Tipos TypeScript estão definidos
- [x] Testes básicos de CRUD foram realizados para validar o esquema

## Próximos Passos

Após estabelecer o esquema de banco de dados, prosseguir para a [Fase 3: Autenticação e Usuários](./03-autenticacao-usuarios.md), onde implementaremos o sistema de autenticação e gerenciamento de usuários. 