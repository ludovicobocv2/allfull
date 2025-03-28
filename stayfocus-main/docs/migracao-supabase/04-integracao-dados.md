# Fase 4: Integração de Dados

## Objetivos
- Migrar dados existentes para o Supabase
- Implementar funções para sincronização de dados
- Configurar processamento de dados contextuais para RAG

## Componentes Principais

### 1. Scripts de Migração de Dados

```typescript
// scripts/migrate-data.ts
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Cliente Supabase com chave de serviço para operações administrativas
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function migrateUsers() {
  console.log('Iniciando migração de usuários...');
  
  try {
    // Ler arquivo de origem dos dados (exemplo: exportação JSON do banco anterior)
    const usersData = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'data', 'users.json'), 'utf8')
    );
    
    // Processar em lotes para evitar sobrecarga
    const batchSize = 50;
    let processedCount = 0;
    
    for (let i = 0; i < usersData.length; i += batchSize) {
      const batch = usersData.slice(i, i + batchSize);
      
      // Transformar dados para o formato do Supabase
      const transformedUsers = batch.map(user => ({
        id: user.id, // Manter IDs originais se possível
        email: user.email,
        first_name: user.name?.split(' ')[0] || '',
        last_name: user.name?.split(' ').slice(1).join(' ') || '',
        avatar_url: user.avatar,
        phone: user.phone || null,
        created_at: user.created_at || new Date().toISOString(),
        updated_at: user.updated_at || new Date().toISOString(),
        is_onboarded: Boolean(user.completed_onboarding)
      }));
      
      // Inserir no Supabase com upsert para evitar duplicados
      const { error } = await supabase
        .from('users')
        .upsert(transformedUsers, { onConflict: 'id' });
        
      if (error) {
        console.error(`Erro ao migrar lote de usuários (${i}-${i+batchSize}):`, error);
      } else {
        processedCount += batch.length;
        console.log(`Migrados ${processedCount}/${usersData.length} usuários`);
      }
    }
    
    console.log('Migração de usuários concluída!');
  } catch (error) {
    console.error('Erro durante migração de usuários:', error);
    throw error;
  }
}

async function migratePreferences() {
  console.log('Iniciando migração de preferências...');
  
  try {
    // Ler preferências do arquivo exportado
    const preferencesData = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'data', 'preferences.json'), 'utf8')
    );
    
    // Processar em lotes
    const batchSize = 100;
    let processedCount = 0;
    
    for (let i = 0; i < preferencesData.length; i += batchSize) {
      const batch = preferencesData.slice(i, i + batchSize);
      
      // Transformar para o formato do Supabase
      const transformedPreferences = batch.map(pref => ({
        user_id: pref.user_id,
        theme: pref.theme || 'light',
        notification_preferences: pref.notifications || {},
        focus_settings: pref.focus_settings || {},
        accessibility_settings: pref.accessibility || {},
        created_at: pref.created_at || new Date().toISOString(),
        updated_at: pref.updated_at || new Date().toISOString()
      }));
      
      // Inserir no Supabase
      const { error } = await supabase
        .from('user_preferences')
        .upsert(transformedPreferences, { onConflict: 'user_id' });
        
      if (error) {
        console.error(`Erro ao migrar lote de preferências (${i}-${i+batchSize}):`, error);
      } else {
        processedCount += batch.length;
        console.log(`Migradas ${processedCount}/${preferencesData.length} preferências`);
      }
    }
    
    console.log('Migração de preferências concluída!');
  } catch (error) {
    console.error('Erro durante migração de preferências:', error);
    throw error;
  }
}

// Migrar dados contextuais para RAG
async function migrateContextualData() {
  console.log('Iniciando migração de dados contextuais...');
  
  try {
    // Ler dados de contexto
    const contextData = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'data', 'user_context.json'), 'utf8')
    );
    
    // Processar em lotes menores (dados podem ser grandes)
    const batchSize = 20;
    let processedCount = 0;
    
    for (let i = 0; i < contextData.length; i += batchSize) {
      const batch = contextData.slice(i, i + batchSize);
      
      // Transformar para o formato do Supabase
      const transformedContextData = batch.map(ctx => ({
        user_id: ctx.user_id,
        content: ctx.content,
        content_vector: null, // Será calculado por trigger no banco
        source: ctx.source || 'migrated',
        metadata: ctx.metadata || {},
        created_at: ctx.created_at || new Date().toISOString()
      }));
      
      // Inserir no Supabase
      const { error } = await supabase
        .from('contextual_data')
        .insert(transformedContextData);
        
      if (error) {
        console.error(`Erro ao migrar lote de dados contextuais (${i}-${i+batchSize}):`, error);
      } else {
        processedCount += batch.length;
        console.log(`Migrados ${processedCount}/${contextData.length} dados contextuais`);
      }
    }
    
    console.log('Migração de dados contextuais concluída!');
  } catch (error) {
    console.error('Erro durante migração de dados contextuais:', error);
    throw error;
  }
}

// Função principal para executar migrações
async function migrateAllData() {
  try {
    await migrateUsers();
    await migratePreferences();
    await migrateContextualData();
    console.log('Migração completa realizada com sucesso!');
  } catch (error) {
    console.error('Erro durante o processo de migração:', error);
    process.exit(1);
  }
}

// Iniciar migração
migrateAllData();
```

### 2. Função SQL para Busca Vetorial

```sql
-- migrations/0010_add_vector_search_function.sql

-- Função para busca vetorial de dados contextuais
CREATE OR REPLACE FUNCTION search_user_context(
  user_id UUID,
  query_text TEXT,
  match_limit INTEGER DEFAULT 5
) 
RETURNS TABLE (
  id UUID,
  user_id UUID,
  content TEXT,
  source TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  query_embedding vector(1536);
BEGIN
  -- Gerar embedding para a consulta
  SELECT embedding INTO query_embedding 
  FROM generate_embeddings(query_text);
  
  -- Retornar resultados mais similares
  RETURN QUERY
  SELECT
    cd.id,
    cd.user_id,
    cd.content,
    cd.source,
    cd.metadata,
    1 - (cd.content_vector <=> query_embedding) as similarity
  FROM
    contextual_data cd
  WHERE
    cd.user_id = search_user_context.user_id
    AND cd.content_vector IS NOT NULL
  ORDER BY
    cd.content_vector <=> query_embedding
  LIMIT match_limit;
END;
$$;

-- Função auxiliar para gerar embeddings
CREATE OR REPLACE FUNCTION generate_embeddings(text_input TEXT)
RETURNS TABLE (embedding vector(1536))
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_key TEXT;
  response JSONB;
BEGIN
  -- Obter API key do armazenamento seguro
  SELECT decrypted_secret INTO api_key 
  FROM vault.decrypted_secrets 
  WHERE name = 'openai_key';
  
  -- Chamar API OpenAI para gerar embedding
  SELECT INTO response
    http_post(
      'https://api.openai.com/v1/embeddings',
      jsonb_build_object(
        'model', 'text-embedding-ada-002',
        'input', text_input
      )::text,
      'application/json',
      ARRAY[
        http_header('Authorization', 'Bearer ' || api_key)
      ]
    );
  
  -- Extrair e retornar o embedding
  RETURN QUERY SELECT
    (response->'data'->0->'embedding')::vector(1536);
END;
$$;
```

### 3. Função para Processamento de Dados Contextuais

```typescript
// lib/contextual-data/processor.ts
import { supabase } from '@/lib/supabaseServer';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Processar dados de usuários para extrair informações contextuais
export async function processUserDataForContext(userId: string) {
  try {
    // Buscar dados do usuário
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (userError) throw userError;
    
    // Buscar preferências
    const { data: preferences, error: prefError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (prefError && prefError.code !== 'PGRST116') throw prefError; // Ignorar erro de "não encontrado"
    
    // Buscar dados de hyperfoco
    const { data: focusData, error: focusError } = await supabase
      .from('hyperfocus_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (focusError) throw focusError;
    
    // Gerar strings contextuais
    const contextItems = [];
    
    // Contexto de preferências do usuário
    if (preferences) {
      const accessibilityContext = `Usuário tem as seguintes preferências de acessibilidade: ${JSON.stringify(preferences.accessibility_settings)}`;
      contextItems.push({
        content: accessibilityContext,
        source: 'user_preferences',
        metadata: { type: 'accessibility' }
      });
      
      const focusContext = `Usuário configura suas sessões de foco com estas preferências: ${JSON.stringify(preferences.focus_settings)}`;
      contextItems.push({
        content: focusContext,
        source: 'user_preferences',
        metadata: { type: 'focus' }
      });
    }
    
    // Contexto de sessões de hyperfoco
    if (focusData && focusData.length > 0) {
      // Calcular estatísticas
      const totalSessions = focusData.length;
      const completedSessions = focusData.filter(s => s.status === 'completed').length;
      const averageDuration = focusData.reduce((sum, session) => {
        const duration = session.end_time 
          ? (new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 60000 
          : 0;
        return sum + duration;
      }, 0) / totalSessions;
      
      const focusStatsContext = `O usuário completou ${completedSessions} de ${totalSessions} sessões recentes de hyperfoco, com duração média de ${averageDuration.toFixed(0)} minutos.`;
      contextItems.push({
        content: focusStatsContext,
        source: 'focus_statistics',
        metadata: { type: 'stats' }
      });
    }
    
    // Inserir itens no banco
    for (const item of contextItems) {
      await supabase.from('contextual_data').insert({
        user_id: userId,
        content: item.content,
        source: item.source,
        metadata: item.metadata
      });
    }
    
    console.log(`Processados ${contextItems.length} itens contextuais para o usuário ${userId}`);
    return contextItems.length;
  } catch (error) {
    console.error('Erro ao processar dados contextuais:', error);
    throw error;
  }
}

// Função para ser chamada periodicamente ou por webhook
export async function scheduleContextProcessing() {
  try {
    // Buscar usuários que precisam de atualização de contexto
    const { data: users, error } = await supabase
      .from('users')
      .select('id')
      .order('context_updated_at', { ascending: true, nullsFirst: true })
      .limit(50); // Processar em lotes
      
    if (error) throw error;
    
    console.log(`Processando contexto para ${users.length} usuários`);
    
    for (const user of users) {
      await processUserDataForContext(user.id);
      
      // Atualizar timestamp de processamento
      await supabase
        .from('users')
        .update({ context_updated_at: new Date().toISOString() })
        .eq('id', user.id);
    }
    
    return users.length;
  } catch (error) {
    console.error('Erro no processamento agendado de contexto:', error);
    throw error;
  }
}
```

## Tipos para Integração

```typescript
// types/database.ts

// Tipos gerados pelo Supabase para garantir type safety

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          phone: string | null
          created_at: string
          updated_at: string
          is_onboarded: boolean
          context_updated_at: string | null
        }
        Insert: {
          id?: string
          email: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
          is_onboarded?: boolean
          context_updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
          is_onboarded?: boolean
          context_updated_at?: string | null
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          theme: string
          notification_preferences: Json
          focus_settings: Json
          accessibility_settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          theme?: string
          notification_preferences?: Json
          focus_settings?: Json
          accessibility_settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          theme?: string
          notification_preferences?: Json
          focus_settings?: Json
          accessibility_settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      contextual_data: {
        Row: {
          id: string
          user_id: string
          content: string
          content_vector: unknown | null
          source: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          content_vector?: unknown | null
          source: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          content_vector?: unknown | null
          source?: string
          metadata?: Json
          created_at?: string
        }
      }
    }
  }
}
```

## Passos de Implementação

1. Criar scripts de migração para dados existentes
2. Configurar funções SQL para busca vetorial
3. Implementar processamento de dados contextuais
4. Configurar cron jobs para atualização periódica
5. Validar integridade dos dados migrados

## Verificação

- [ ] Migração de usuários completa
- [ ] Migração de preferências completa
- [ ] Migração de dados contextuais completa
- [ ] Busca vetorial funcionando corretamente
- [ ] Processamento periódico configurado

## Próximos Passos

- Implementação de dashboards administrativos
- Sistema de sincronização em tempo real de dados
- Melhorias no processamento de dados contextuais 