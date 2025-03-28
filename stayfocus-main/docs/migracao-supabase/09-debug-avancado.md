# Fase 9: Debug Avançado para RAG

## Objetivos
- Implementar ferramentas avançadas de debug para o assistente RAG
- Criar páginas de administração para monitoramento em tempo real
- Desenvolver sistema de logs detalhados para análise de problemas

## Componentes Principais

### 1. Sistema de Logging Avançado

```typescript
// lib/rag/debug.ts
import { supabase } from '@/lib/supabaseServer';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

export enum LogComponent {
  RAG_PROCESSOR = 'rag_processor',
  CONTEXT_RETRIEVAL = 'context_retrieval',
  WHATSAPP = 'whatsapp',
  PAYMENT = 'payment',
  AUTH = 'auth'
}

interface LogEntry {
  level: LogLevel;
  component: LogComponent;
  message: string;
  details?: any;
  userId?: string;
}

export async function logEvent({
  level,
  component,
  message,
  details,
  userId
}: LogEntry) {
  try {
    await supabase.from('system_logs').insert({
      level,
      component,
      message,
      details,
      user_id: userId,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    // Fallback para console em caso de falha no DB
    console.error('Erro ao registrar log:', { level, component, message, error });
  }
}

export function logRagEvent(
  userId: string, 
  message: string, 
  details: any, 
  level: LogLevel = LogLevel.INFO
) {
  return logEvent({
    level,
    component: LogComponent.RAG_PROCESSOR,
    message,
    details,
    userId
  });
}

export function logContextRetrievalEvent(
  userId: string,
  message: string,
  details: any,
  level: LogLevel = LogLevel.INFO
) {
  return logEvent({
    level,
    component: LogComponent.CONTEXT_RETRIEVAL,
    message,
    details,
    userId
  });
}

export function logError(
  component: LogComponent,
  message: string,
  error: any,
  userId?: string
) {
  return logEvent({
    level: LogLevel.ERROR,
    component,
    message,
    details: {
      error: error.message,
      stack: error.stack,
      ...error
    },
    userId
  });
}
```

### 2. Página de Debug da RAG

```typescript
// pages/admin/debug/rag.tsx
import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { LogLevel, LogComponent } from '@/lib/rag/debug';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

function RagDebugPage() {
  const supabase = useSupabaseClient();
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState({
    level: '' as LogLevel | '',
    component: LogComponent.RAG_PROCESSOR,
    userId: '',
    limit: 50
  });
  
  const fetchLogs = async () => {
    let query = supabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(filter.limit);
      
    if (filter.level) {
      query = query.eq('level', filter.level);
    }
    
    if (filter.component) {
      query = query.eq('component', filter.component);
    }
    
    if (filter.userId) {
      query = query.eq('user_id', filter.userId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao buscar logs:', error);
      return;
    }
    
    setLogs(data || []);
  };
  
  useEffect(() => {
    fetchLogs();
    
    // Configurar atualizações em tempo real
    const subscription = supabase
      .channel('rag-logs')
      .on('postgres_changes', { 
        event: 'INSERT',
        schema: 'public',
        table: 'system_logs'
      }, (payload) => {
        // Verificar se o novo log atende aos filtros
        const newLog = payload.new;
        if (
          (!filter.level || newLog.level === filter.level) &&
          (!filter.component || newLog.component === filter.component) &&
          (!filter.userId || newLog.user_id === filter.userId)
        ) {
          setLogs((current) => [newLog, ...current.slice(0, filter.limit - 1)]);
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [filter]);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Debug RAG</h1>
      
      {/* Filtros */}
      <div className="flex flex-wrap gap-4 mb-6 bg-gray-100 p-4 rounded">
        <div>
          <label className="block text-sm mb-1">Nível</label>
          <select
            className="border rounded px-2 py-1"
            value={filter.level}
            onChange={(e) => setFilter({...filter, level: e.target.value as LogLevel | ''})}
          >
            <option value="">Todos</option>
            <option value={LogLevel.DEBUG}>Debug</option>
            <option value={LogLevel.INFO}>Info</option>
            <option value={LogLevel.WARNING}>Warning</option>
            <option value={LogLevel.ERROR}>Error</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm mb-1">Componente</label>
          <select
            className="border rounded px-2 py-1"
            value={filter.component}
            onChange={(e) => setFilter({...filter, component: e.target.value as LogComponent})}
          >
            <option value="">Todos</option>
            <option value={LogComponent.RAG_PROCESSOR}>Processador RAG</option>
            <option value={LogComponent.CONTEXT_RETRIEVAL}>Recuperação de Contexto</option>
            <option value={LogComponent.WHATSAPP}>WhatsApp</option>
            <option value={LogComponent.PAYMENT}>Pagamentos</option>
            <option value={LogComponent.AUTH}>Autenticação</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm mb-1">ID do Usuário</label>
          <input
            type="text"
            className="border rounded px-2 py-1"
            value={filter.userId}
            onChange={(e) => setFilter({...filter, userId: e.target.value})}
            placeholder="ID do usuário"
          />
        </div>
        
        <div>
          <label className="block text-sm mb-1">Limite</label>
          <select
            className="border rounded px-2 py-1"
            value={filter.limit}
            onChange={(e) => setFilter({...filter, limit: Number(e.target.value)})}
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>
        
        <div className="flex items-end">
          <button
            onClick={fetchLogs}
            className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600"
          >
            Atualizar
          </button>
        </div>
      </div>
      
      {/* Tabela de Logs */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-200">
              <th className="py-2 px-4 border text-left">Timestamp</th>
              <th className="py-2 px-4 border text-left">Nível</th>
              <th className="py-2 px-4 border text-left">Componente</th>
              <th className="py-2 px-4 border text-left">Mensagem</th>
              <th className="py-2 px-4 border text-left">Usuário</th>
              <th className="py-2 px-4 border text-left">Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className={
                log.level === LogLevel.ERROR ? 'bg-red-50' :
                log.level === LogLevel.WARNING ? 'bg-yellow-50' : ''
              }>
                <td className="py-2 px-4 border">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="py-2 px-4 border">
                  <span className={
                    log.level === LogLevel.ERROR ? 'text-red-600 font-semibold' :
                    log.level === LogLevel.WARNING ? 'text-yellow-600 font-semibold' :
                    log.level === LogLevel.INFO ? 'text-blue-600' :
                    'text-gray-600'
                  }>
                    {log.level}
                  </span>
                </td>
                <td className="py-2 px-4 border">{log.component}</td>
                <td className="py-2 px-4 border">{log.message}</td>
                <td className="py-2 px-4 border">{log.user_id || '-'}</td>
                <td className="py-2 px-4 border">
                  <details>
                    <summary className="cursor-pointer">Ver detalhes</summary>
                    <pre className="text-xs mt-2 bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {logs.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Nenhum log encontrado com os filtros atuais.
        </div>
      )}
    </div>
  );
}

export default withAdminAuth(RagDebugPage);
```

### 3. API de Teste RAG

```typescript
// pages/api/admin/rag-test.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';
import { generateAssistantResponse } from '@/lib/rag/processor';
import { searchContextualData } from '@/lib/rag/client';
import { logRagEvent, LogLevel } from '@/lib/rag/debug';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar se o usuário é administrador
  const adminUser = await verifyAdmin(req);
  if (!adminUser) {
    return res.status(403).json({ error: 'Acesso não autorizado' });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    const { userId, message, testMode } = req.body;
    
    if (!userId || !message) {
      return res.status(400).json({ error: 'Parâmetros incompletos' });
    }
    
    // Registrar início do teste
    await logRagEvent(
      userId,
      'Teste de RAG iniciado por administrador',
      { message, testMode, adminId: adminUser.id },
      LogLevel.INFO
    );
    
    // Se modo de teste completo, retornar também dados contextuais
    if (testMode === 'full') {
      const startTime = Date.now();
      
      // Buscar dados contextuais
      const contextData = await searchContextualData(userId, message);
      
      // Gerar resposta
      const response = await generateAssistantResponse(userId, message);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Registrar conclusão
      await logRagEvent(
        userId,
        'Teste de RAG concluído',
        { 
          message, 
          contextCount: contextData.length,
          processingTime,
          responseLength: response.length
        },
        LogLevel.INFO
      );
      
      return res.status(200).json({
        response,
        contextData,
        processingTime,
        timestamp: new Date().toISOString()
      });
    } else {
      // Modo simples: apenas retornar a resposta
      const response = await generateAssistantResponse(userId, message);
      
      return res.status(200).json({
        response,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    console.error('Erro no teste de RAG:', error);
    
    return res.status(500).json({
      error: 'Erro ao processar teste de RAG',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
```

## Extensão para Monitoramento em Produção

```typescript
// lib/rag/processor.ts (adicionar dentro da função existente)
export async function generateAssistantResponse(userId: string, message: string) {
  const startTime = Date.now();
  let contextData = [];
  
  try {
    // Log de início do processamento
    await logRagEvent(
      userId,
      'Iniciando processamento de mensagem RAG',
      { message },
      LogLevel.DEBUG
    );
    
    try {
      // Buscar dados contextuais relevantes
      contextData = await searchContextualData(userId, message);
      
      await logContextRetrievalEvent(
        userId,
        'Dados contextuais recuperados',
        { 
          count: contextData.length,
          contextSummary: contextData.map(c => c.content.substring(0, 50) + '...') 
        },
        LogLevel.DEBUG
      );
    } catch (error) {
      await logError(
        LogComponent.CONTEXT_RETRIEVAL,
        'Erro ao recuperar contexto',
        error,
        userId
      );
      throw error;
    }
    
    // Construir o prompt com contexto
    const prompt = buildPromptWithContext(message, contextData);
    
    // Gerar resposta com OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "Você é um assistente especializado para pessoas neurodivergentes, focado em gerenciamento de tempo e concentração."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    const response = completion.choices[0].message.content;
    const endTime = Date.now();
    
    // Log de conclusão
    await logRagEvent(
      userId,
      'Resposta RAG gerada com sucesso',
      { 
        processingTime: endTime - startTime,
        contextCount: contextData.length,
        responseLength: response.length,
        responseSummary: response.substring(0, 100) + '...'
      },
      LogLevel.INFO
    );
    
    // Registrar métricas
    await logRAGInteraction({
      userId,
      query: message,
      contextItems: contextData.length,
      responseLength: response.length,
      responseTime: endTime - startTime
    });

    return response;
  } catch (error) {
    const endTime = Date.now();
    
    // Log de erro
    await logError(
      LogComponent.RAG_PROCESSOR,
      'Erro ao gerar resposta RAG',
      {
        error,
        processingTime: endTime - startTime,
        message,
        contextCount: contextData.length
      },
      userId
    );
    
    throw error;
  }
}
```

## Passos de Implementação

1. Implementar sistema avançado de logging
2. Criar tabela de logs no Supabase
3. Desenvolver páginas de administração para monitoramento
4. Adicionar logs detalhados nas funções críticas do RAG
5. Implementar API para testes controlados do assistente

## Verificação

- [ ] Sistema de logging registrando eventos corretamente
- [ ] Página de debug exibindo logs filtrados
- [ ] API de teste permitindo análise de respostas
- [ ] Monitoramento em tempo real funcionando
- [ ] Detecção e registro adequado de erros

## Próximos Passos

- Implementação de alertas para erros críticos
- Dashboard de qualidade de respostas
- Sistema de feedback de administradores para respostas geradas 