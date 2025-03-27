# Fase 4: Integração de Dados

## Objetivo

Implementar a migração e sincronização de dados existentes para o Supabase, estabelecendo mecanismos de integração contínua e estruturas para armazenamento dos dados contextuais que alimentarão o assistente RAG.

## Raciocínio

A qualidade do assistente RAG depende diretamente da qualidade e estruturação dos dados contextuais disponíveis. Nesta fase, devemos garantir que todos os dados relevantes sejam importados para o Supabase e organizados de forma a facilitar sua recuperação eficiente pelo sistema RAG. Além disso, precisamos implementar rotinas de sincronização para manter esses dados atualizados.

## Etapas Detalhadas

### 4.1 Análise de dados existentes

Antes de iniciar a migração, é importante mapear todas as fontes de dados existentes:

1. **Fontes de dados a considerar:**
   - Banco de dados atual (se existente)
   - Arquivos locais
   - APIs externas utilizadas
   - Dados de exemplo para desenvolvimento

2. **Categorias de dados para o assistente RAG:**
   - Dados de finanças do usuário
   - Histórico de hiperfocos
   - Informações de estudos
   - Preferências alimentares
   - Histórico de conversas anteriores
   - Configurações pessoais

### 4.2 Scripts de migração de dados

**Criar arquivo `scripts/migracao/migracao-dados.js`:**

```javascript
// Este script deve ser executado uma única vez para migrar dados existentes para o Supabase
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração do cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Chave com permissões elevadas para inserção em massa
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Função principal de migração
async function migrarDados() {
  console.log('Iniciando migração de dados para Supabase...');

  try {
    // 1. Migração de usuários
    await migrarUsuarios();
    
    // 2. Migração de preferências
    await migrarPreferencias();
    
    // 3. Migração de dados contextuais
    await migrarDadosContextuais();
    
    console.log('Migração concluída com sucesso!');
  } catch (error) {
    console.error('Erro na migração:', error);
    process.exit(1);
  }
}

// Função para migrar usuários
async function migrarUsuarios() {
  console.log('Migrando usuários...');
  
  try {
    // Ler dados de usuários do arquivo (exemplo)
    const dadosUsuarios = JSON.parse(fs.readFileSync(
      path.join(__dirname, 'dados', 'usuarios.json'),
      'utf8'
    ));
    
    // Para cada usuário, verificar se já existe e inserir/atualizar
    for (const usuario of dadosUsuarios) {
      // Verificar se o usuário já existe no Auth
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserByEmail(
        usuario.email
      );
      
      if (authError && authError.status !== 404) {
        throw authError;
      }
      
      // Se o usuário não existe no Auth, criar
      if (!authUser) {
        // Criar usuário no Auth
        const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
          email: usuario.email,
          password: 'senha-temporaria-123', // Senha temporária que deverá ser alterada
          email_confirm: true // Marcar e-mail como confirmado
        });
        
        if (createError) throw createError;
        
        // Inserir dados do usuário na tabela usuarios
        const { error: insertError } = await supabase
          .from('usuarios')
          .insert({
            auth_id: newAuthUser.user.id,
            email: usuario.email,
            nome_completo: usuario.nome || 'Usuário',
            whatsapp_number: usuario.whatsapp || null,
            tipo_plano: usuario.plano || 'free'
          });
        
        if (insertError) throw insertError;
        
        console.log(`Usuário criado: ${usuario.email}`);
      } else {
        // Usuário já existe, verificar se já está na tabela usuarios
        const { data: existingUser, error: queryError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('auth_id', authUser.id)
          .single();
        
        if (queryError && queryError.code !== 'PGRST116') {
          throw queryError;
        }
        
        // Se não estiver na tabela usuarios, inserir
        if (!existingUser) {
          const { error: insertError } = await supabase
            .from('usuarios')
            .insert({
              auth_id: authUser.id,
              email: usuario.email,
              nome_completo: usuario.nome || 'Usuário',
              whatsapp_number: usuario.whatsapp || null,
              tipo_plano: usuario.plano || 'free'
            });
          
          if (insertError) throw insertError;
          
          console.log(`Dados de usuário inseridos: ${usuario.email}`);
        } else {
          console.log(`Usuário já existente: ${usuario.email}`);
        }
      }
    }
    
    console.log('Migração de usuários concluída');
  } catch (error) {
    console.error('Erro ao migrar usuários:', error);
    throw error;
  }
}

// Função para migrar preferências
async function migrarPreferencias() {
  console.log('Migrando preferências...');
  
  try {
    // Buscar todos os usuários do sistema
    const { data: usuarios, error: userError } = await supabase
      .from('usuarios')
      .select('id, email');
    
    if (userError) throw userError;
    
    // Ler dados de preferências (exemplo)
    const dadosPreferencias = JSON.parse(fs.readFileSync(
      path.join(__dirname, 'dados', 'preferencias.json'),
      'utf8'
    ));
    
    // Para cada usuário, verificar se já tem preferências
    for (const usuario of usuarios) {
      // Buscar se o usuário tem preferências definidas
      const { data: existingPrefs, error: prefsError } = await supabase
        .from('preferencias')
        .select('*')
        .eq('usuario_id', usuario.id)
        .single();
      
      if (prefsError && prefsError.code !== 'PGRST116') {
        throw prefsError;
      }
      
      // Se não tiver preferências, criar com base nos dados de migração ou valores padrão
      if (!existingPrefs) {
        // Buscar preferências nos dados de migração
        const prefsMigracao = dadosPreferencias.find(p => p.email === usuario.email);
        
        const { error: insertError } = await supabase
          .from('preferencias')
          .insert({
            usuario_id: usuario.id,
            tema: prefsMigracao?.tema || 'system',
            notificacoes_email: prefsMigracao?.notificacoes_email !== undefined ? 
              prefsMigracao.notificacoes_email : true,
            notificacoes_whatsapp: prefsMigracao?.notificacoes_whatsapp || false,
            frequencia_notificacoes: prefsMigracao?.frequencia_notificacoes || 'diaria',
            configuracoes_rag: prefsMigracao?.configuracoes_rag || {}
          });
        
        if (insertError) throw insertError;
        
        console.log(`Preferências criadas para: ${usuario.email}`);
      } else {
        console.log(`Preferências já existentes para: ${usuario.email}`);
      }
    }
    
    console.log('Migração de preferências concluída');
  } catch (error) {
    console.error('Erro ao migrar preferências:', error);
    throw error;
  }
}

// Função para migrar dados contextuais
async function migrarDadosContextuais() {
  console.log('Migrando dados contextuais...');
  
  try {
    // Buscar todos os usuários do sistema
    const { data: usuarios, error: userError } = await supabase
      .from('usuarios')
      .select('id, email');
    
    if (userError) throw userError;
    
    // Diretórios com dados contextuais por categoria
    const categorias = ['financas', 'hiperfocos', 'estudos', 'alimentacao'];
    
    for (const usuario of usuarios) {
      for (const categoria of categorias) {
        const caminhoArquivo = path.join(
          __dirname, 
          'dados', 
          'contextuais', 
          categoria, 
          `${usuario.email.replace('@', '_at_')}.json`
        );
        
        // Verificar se existe arquivo de dados para este usuário e categoria
        if (fs.existsSync(caminhoArquivo)) {
          const dadosContextuais = JSON.parse(fs.readFileSync(caminhoArquivo, 'utf8'));
          
          // Inserir cada item de dados contextuais
          for (const item of dadosContextuais) {
            const { error: insertError } = await supabase
              .from('dados_contextuais')
              .insert({
                usuario_id: usuario.id,
                tipo: categoria,
                titulo: item.titulo || null,
                conteudo: item.conteudo,
                relevancia: item.relevancia || 5
                // O embedding será gerado mais tarde pelo processo de vetorização
              });
            
            if (insertError) throw insertError;
          }
          
          console.log(`Dados contextuais de ${categoria} migrados para: ${usuario.email}`);
        } else {
          console.log(`Sem dados contextuais de ${categoria} para: ${usuario.email}`);
        }
      }
    }
    
    console.log('Migração de dados contextuais concluída');
  } catch (error) {
    console.error('Erro ao migrar dados contextuais:', error);
    throw error;
  }
}

// Executar migração
migrarDados();
```

**Criar diretório e arquivos de exemplo para a migração:**

```
scripts/
└── migracao/
    ├── migracao-dados.js
    └── dados/
        ├── usuarios.json
        ├── preferencias.json
        └── contextuais/
            ├── financas/
            ├── hiperfocos/
            ├── estudos/
            └── alimentacao/
```

### 4.3 Implementar funções de integração para dados contextuais

**Criar arquivo `app/lib/data-integration.ts`:**

```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database, DadoContextual } from '@/types/database';

// Cliente Supabase para componentes
const getClient = () => createClientComponentClient<Database>();

/**
 * Salva um dado contextual no banco de dados
 */
export async function saveContextData(
  usuarioId: string,
  tipo: string,
  titulo: string | null,
  conteudo: Record<string, any>,
  relevancia: number = 5
): Promise<DadoContextual | null> {
  const supabase = getClient();
  
  try {
    // Inserir o dado contextual
    const { data, error } = await supabase
      .from('dados_contextuais')
      .insert({
        usuario_id: usuarioId,
        tipo,
        titulo,
        conteudo,
        relevancia
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Opcionalmente, acionar processo para gerar embedding
    // Este é um ponto de integração para conectar com um serviço de embeddings
    // A implementação real dependerá de como os embeddings serão gerados
    
    return data;
  } catch (error) {
    console.error('Erro ao salvar dado contextual:', error);
    return null;
  }
}

/**
 * Atualiza um dado contextual existente
 */
export async function updateContextData(
  dadoId: string,
  updates: Partial<Omit<DadoContextual, 'id' | 'usuario_id' | 'created_at' | 'updated_at'>>
): Promise<DadoContextual | null> {
  const supabase = getClient();
  
  try {
    const { data, error } = await supabase
      .from('dados_contextuais')
      .update(updates)
      .eq('id', dadoId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Se o conteúdo foi alterado, sinalizamos que o embedding precisa ser recalculado
    if (updates.conteudo) {
      // Aqui poderia haver uma chamada para recalcular o embedding
      // A implementação depende da estratégia de geração de embeddings
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao atualizar dado contextual:', error);
    return null;
  }
}

/**
 * Recupera dados contextuais de um usuário por tipo
 */
export async function getContextDataByType(
  usuarioId: string,
  tipo: string
): Promise<DadoContextual[]> {
  const supabase = getClient();
  
  try {
    const { data, error } = await supabase
      .from('dados_contextuais')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('tipo', tipo)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error(`Erro ao buscar dados contextuais do tipo ${tipo}:`, error);
    return [];
  }
}

/**
 * Função para salvar finanças como dados contextuais
 */
export async function saveFinanceData(
  usuarioId: string,
  dados: {
    categoria: string;
    valor: number;
    descricao: string;
    data: string;
    recorrente?: boolean;
  }
): Promise<DadoContextual | null> {
  return saveContextData(
    usuarioId,
    'financas',
    `${dados.categoria}: ${dados.descricao}`,
    {
      ...dados,
      tipo_dado: 'transacao'
    },
    // Definir relevância maior para valores maiores
    Math.min(Math.max(Math.floor(Math.log10(dados.valor) + 3), 1), 10)
  );
}

/**
 * Função para salvar dados de hiperfoco como dados contextuais
 */
export async function saveHyperfocusData(
  usuarioId: string,
  dados: {
    titulo: string;
    descricao: string;
    inicio: string;
    fim?: string;
    completo: boolean;
    prioridade: number;
  }
): Promise<DadoContextual | null> {
  return saveContextData(
    usuarioId,
    'hiperfocos',
    dados.titulo,
    {
      ...dados,
      tipo_dado: 'hiperfoco'
    },
    // Prioridade define relevância
    dados.prioridade
  );
}

/**
 * Função para salvar dados de estudo como dados contextuais
 */
export async function saveStudyData(
  usuarioId: string,
  dados: {
    assunto: string;
    notas: string;
    data: string;
    duracao_minutos: number;
    avaliacao: number;
  }
): Promise<DadoContextual | null> {
  return saveContextData(
    usuarioId,
    'estudos',
    dados.assunto,
    {
      ...dados,
      tipo_dado: 'sessao_estudo'
    },
    // Avaliação define relevância
    dados.avaliacao
  );
}

/**
 * Função para salvar dados de alimentação como dados contextuais
 */
export async function saveFoodData(
  usuarioId: string,
  dados: {
    refeicao: string;
    alimentos: string[];
    horario: string;
    sensacoes: string[];
  }
): Promise<DadoContextual | null> {
  return saveContextData(
    usuarioId,
    'alimentacao',
    `Refeição: ${dados.refeicao}`,
    {
      ...dados,
      tipo_dado: 'refeicao'
    },
    // Relevância padrão para alimentação
    5
  );
}
```

### 4.4 Implementar função para indexação e vetorização de dados

**Criar arquivo `app/lib/embedding-service.ts`:**

```typescript
import { createClient } from '@supabase/supabase-js';

// Para ambiente servidor
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Função para gerar embedding usando uma API externa (exemplo)
async function generateEmbedding(text: string): Promise<number[]> {
  // Este é um exemplo simplificado. Na implementação real, você usaria:
  // 1. Uma API como OpenAI para gerar embeddings
  // 2. Ou uma biblioteca local como TensorFlow.js
  
  try {
    // Exemplo com OpenAI (pseudocódigo)
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text
      })
    });
    
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Erro ao gerar embedding:', error);
    
    // Retornar um vetor de zeros em caso de erro (para não quebrar o fluxo)
    // Na implementação real, você deveria lidar com isso de forma mais adequada
    return Array(1536).fill(0);
  }
}

// Função para processar dados contextuais e gerar embeddings
export async function processContextualData() {
  // Esta função seria executada periodicamente ou acionada por eventos
  // Para processamento em lote de dados sem embedding
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Buscar dados contextuais sem embedding
    const { data: dadosSemEmbedding, error } = await supabase
      .from('dados_contextuais')
      .select('id, tipo, titulo, conteudo')
      .is('embedding', null);
    
    if (error) throw error;
    
    console.log(`Processando ${dadosSemEmbedding?.length || 0} dados contextuais`);
    
    // Processar cada dado
    for (const dado of (dadosSemEmbedding || [])) {
      // Preparar texto para embedding
      const textoParaEmbedding = [
        dado.titulo,
        typeof dado.conteudo === 'object' ? JSON.stringify(dado.conteudo) : dado.conteudo
      ].filter(Boolean).join(' ');
      
      // Gerar embedding
      const embedding = await generateEmbedding(textoParaEmbedding);
      
      // Atualizar o registro com o embedding
      const { error: updateError } = await supabase
        .from('dados_contextuais')
        .update({ embedding })
        .eq('id', dado.id);
      
      if (updateError) {
        console.error(`Erro ao atualizar embedding para ID ${dado.id}:`, updateError);
      } else {
        console.log(`Embedding gerado para dado ID ${dado.id}`);
      }
    }
    
    return { processados: dadosSemEmbedding?.length || 0 };
  } catch (error) {
    console.error('Erro ao processar dados contextuais:', error);
    throw error;
  }
}

// Função para busca semântica usando embeddings
export async function semanticSearch(
  userId: string,
  query: string,
  tipos: string[] = [],
  limit: number = 5
): Promise<any[]> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Gerar embedding para a consulta
    const queryEmbedding = await generateEmbedding(query);
    
    // Construir a consulta base
    let queryBuilder = supabase
      .rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.5, // Limiar de similaridade
        match_count: limit    // Número de resultados
      })
      .eq('usuario_id', userId);
    
    // Filtrar por tipos, se especificados
    if (tipos.length > 0) {
      queryBuilder = queryBuilder.in('tipo', tipos);
    }
    
    // Executar a consulta
    const { data, error } = await queryBuilder;
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Erro na busca semântica:', error);
    return [];
  }
}
```

### 4.5 Criar função SQL para busca vetorial

Esta função deve ser criada no Supabase SQL Editor:

```sql
-- Habilitar a extensão pgvector se ainda não estiver habilitada
CREATE EXTENSION IF NOT EXISTS vector;

-- Função para busca de similaridade por cosseno
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  usuario_id uuid,
  tipo text,
  titulo text,
  conteudo jsonb,
  relevancia int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.usuario_id,
    d.tipo,
    d.titulo,
    d.conteudo,
    d.relevancia,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM
    dados_contextuais d
  WHERE
    d.embedding IS NOT NULL
    AND (1 - (d.embedding <=> query_embedding)) > match_threshold
  ORDER BY
    -- Combinar similaridade com relevância para melhor ranking
    ((1 - (d.embedding <=> query_embedding)) * d.relevancia / 10) DESC
  LIMIT match_count;
END;
$$;
```

### 4.6 Implementar função para agendamento de processamento de dados

**Criar arquivo `app/api/cron/process-data/route.ts`:**

```typescript
import { NextResponse } from 'next/server';
import { processContextualData } from '@/lib/embedding-service';

// Rota para processamento periódico de dados contextuais
// Pode ser chamada por um serviço de cron como Vercel Cron ou similar
export async function GET(request: Request) {
  // Verificar chave de API para segurança
  const { searchParams } = new URL(request.url);
  const apiKey = searchParams.get('api_key');
  
  if (apiKey !== process.env.CRON_API_KEY) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    // Processar dados contextuais sem embeddings
    const result = await processContextualData();
    
    return NextResponse.json(
      { success: true, ...result },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Erro no processamento agendado:', error);
    
    return NextResponse.json(
      { error: error.message || 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}
```

### 4.7 Implementar função para integração em tempo real

**Criar arquivo `app/lib/realtime-sync.ts`:**

```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/database';

// Configuração para assinaturas em tempo real
export function setupRealtimeSubscriptions(
  usuarioId: string,
  callbacks: {
    onContextDataChange?: (payload: any) => void;
    onPreferencesChange?: (payload: any) => void;
    onSubscriptionChange?: (payload: any) => void;
  } = {}
) {
  const supabase = createClientComponentClient<Database>();
  
  // Array para armazenar as assinaturas (para desativar posteriormente)
  const subscriptions = [];
  
  // Assinar a alterações nos dados contextuais do usuário
  if (callbacks.onContextDataChange) {
    const contextDataSubscription = supabase
      .channel('context-data-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Todos os eventos (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'dados_contextuais',
          filter: `usuario_id=eq.${usuarioId}`
        },
        callbacks.onContextDataChange
      )
      .subscribe();
    
    subscriptions.push(contextDataSubscription);
  }
  
  // Assinar a alterações nas preferências do usuário
  if (callbacks.onPreferencesChange) {
    const preferencesSubscription = supabase
      .channel('preferences-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'preferencias',
          filter: `usuario_id=eq.${usuarioId}`
        },
        callbacks.onPreferencesChange
      )
      .subscribe();
    
    subscriptions.push(preferencesSubscription);
  }
  
  // Assinar a alterações nas assinaturas do usuário
  if (callbacks.onSubscriptionChange) {
    const subscriptionSubscription = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assinaturas',
          filter: `usuario_id=eq.${usuarioId}`
        },
        callbacks.onSubscriptionChange
      )
      .subscribe();
    
    subscriptions.push(subscriptionSubscription);
  }
  
  // Função para limpar todas as assinaturas
  const unsubscribeAll = () => {
    subscriptions.forEach(subscription => {
      supabase.removeChannel(subscription);
    });
  };
  
  return { subscriptions, unsubscribeAll };
}
```

## Verificação da Fase

A fase 4 está concluída quando:

- [x] O script de migração de dados está implementado
- [x] As funções de integração para dados contextuais estão implementadas
- [x] O sistema de vetorização (embeddings) está configurado
- [x] A função SQL para busca vetorial está criada no Supabase
- [x] O endpoint de processamento agendado está implementado
- [x] A função para integração em tempo real está implementada
- [x] Testes de migração de dados foram realizados
- [x] Testes de integração contínua foram realizados
- [x] Verificação de busca semântica nos dados contextuais

## Próximos Passos

Após configurar a integração e migração de dados, prosseguir para a [Fase 5: Implementação do Assistente RAG](./05-implementacao-assistente-rag.md), onde implementaremos o núcleo do assistente com capacidade de Retrieval Augmented Generation. 