# Fase 5: Implementação do Assistente RAG

## Objetivos
- Implementar o assistente virtual baseado em tecnologia RAG (Retrieval Augmented Generation)
- Criar componentes de interface para interação com o assistente
- Configurar processamento de contexto personalizado para usuários neurodivergentes

## Componentes Principais

### 1. Configuração do Cliente RAG

```typescript
// lib/rag/client.ts
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';

// Cliente OpenAI para processamento de linguagem natural
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cliente Supabase para acesso aos dados contextuais
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Função para busca vetorial de dados contextuais
export async function searchContextualData(userId: string, query: string) {
  // Implementação da busca vetorial usando Supabase pgvector
  const { data, error } = await supabaseClient.rpc('search_user_context', {
    user_id: userId,
    query_text: query,
    match_limit: 5
  });
  
  if (error) throw error;
  return data;
}
```

### 2. Interface do Assistente

```typescript
// components/AssistantChat.tsx
import React, { useState } from 'react';
import { useUser } from '@/lib/hooks/useUser';
import { sendMessage } from '@/lib/rag/assistant';

export default function AssistantChat() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!input.trim() || !user) return;
    
    setIsLoading(true);
    
    // Adiciona mensagem do usuário
    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    
    try {
      // Obter resposta do assistente
      const assistantResponse = await sendMessage(user.id, input);
      
      // Adiciona resposta do assistente
      setMessages((prev) => [...prev, { role: 'assistant', content: assistantResponse }]);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Interface do chat aqui */}
    </div>
  );
}
```

### 3. Processador RAG

```typescript
// lib/rag/processor.ts
import { openai, searchContextualData } from './client';

export async function generateAssistantResponse(userId: string, message: string) {
  // Buscar dados contextuais relevantes
  const contextData = await searchContextualData(userId, message);
  
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

  return completion.choices[0].message.content;
}

function buildPromptWithContext(message: string, contextData: any[]) {
  // Construir prompt com dados contextuais relevantes
  const contextStr = contextData.map(item => 
    `[Contexto do usuário: ${item.content}]`
  ).join('\n');
  
  return `${contextStr}\n\nPergunta do usuário: ${message}\n\nResponda de forma clara e direta.`;
}
```

## Passos de Implementação

1. Configurar cliente OpenAI e funções de busca vetorial
2. Implementar componentes de interface do assistente
3. Criar API endpoints para comunicação com o assistente
4. Implementar lógica de processamento RAG
5. Testar resposta contextual e personalização

## Verificação

- [ ] Cliente RAG configurado corretamente
- [ ] Componentes de interface funcionando
- [ ] API endpoints respondendo adequadamente
- [ ] Busca vetorial retornando dados relevantes
- [ ] Assistente fornecendo respostas personalizadas

## Próximos Passos

- Integração com sistema de feedback para melhoria contínua
- Implementação de histórico de conversas
- Recursos de exportação de insights do assistente 