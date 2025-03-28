# Fase 8: Testes de Comunicação RAG

## Objetivos
- Implementar testes automatizados para o sistema RAG
- Verificar a qualidade das respostas geradas pelo assistente
- Garantir a correta integração entre todos os componentes do sistema

## Componentes Principais

### 1. Testes de Unidade RAG

```typescript
// __tests__/unit/rag/processor.test.ts
import { generateAssistantResponse } from '@/lib/rag/processor';
import { searchContextualData } from '@/lib/rag/client';
import { openai } from '@/lib/rag/client';

// Mocks
jest.mock('@/lib/rag/client', () => ({
  searchContextualData: jest.fn(),
  openai: {
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }
}));

describe('RAG Processor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('gera resposta com contexto apropriado', async () => {
    // Mock dos dados contextuais
    const mockContextData = [
      { content: 'O usuário tem TDAH e prefere instruções curtas.' },
      { content: 'O usuário tem dificuldade para manter foco em reuniões longas.' }
    ];
    
    // Mock da resposta da OpenAI
    const mockCompletion = {
      choices: [
        {
          message: {
            content: 'Aqui está uma resposta adaptada para suas necessidades de foco.'
          }
        }
      ]
    };
    
    // Configurar os mocks
    (searchContextualData as jest.Mock).mockResolvedValue(mockContextData);
    (openai.chat.completions.create as jest.Mock).mockResolvedValue(mockCompletion);
    
    // Chamar a função a ser testada
    const userId = 'test-user-id';
    const message = 'Como posso melhorar meu foco durante reuniões?';
    const response = await generateAssistantResponse(userId, message);
    
    // Verificar resultados
    expect(searchContextualData).toHaveBeenCalledWith(userId, message);
    expect(openai.chat.completions.create).toHaveBeenCalled();
    
    // Verificar se o prompt contém o contexto
    const createCall = (openai.chat.completions.create as jest.Mock).mock.calls[0][0];
    expect(createCall.messages[1].content).toContain('O usuário tem TDAH');
    expect(createCall.messages[1].content).toContain('dificuldade para manter foco');
    
    // Verificar resposta
    expect(response).toBe('Aqui está uma resposta adaptada para suas necessidades de foco.');
  });

  test('lida com erros na busca de contexto', async () => {
    // Mock de erro na busca de contexto
    (searchContextualData as jest.Mock).mockRejectedValue(new Error('Erro de busca'));
    
    // Testar que a função lança o erro
    await expect(
      generateAssistantResponse('user-id', 'mensagem')
    ).rejects.toThrow('Erro de busca');
  });
});
```

### 2. Testes de Integração

```typescript
// __tests__/integration/rag-integration.test.ts
import { supabase } from '@/lib/supabaseServer';
import { generateAssistantResponse } from '@/lib/rag/processor';
import { createMocks } from 'node-mocks-http';
import assistantApiHandler from '@/pages/api/assistant/message';

// Este teste requer um banco de dados de teste configurado
describe('Integração RAG', () => {
  const testUserId = 'test-integration-user';
  
  // Preparar dados de teste antes dos testes
  beforeAll(async () => {
    // Inserir usuário de teste
    await supabase.from('users').upsert({
      id: testUserId,
      email: 'test@example.com',
      first_name: 'Teste',
      last_name: 'Integração'
    });
    
    // Inserir dados contextuais de teste
    await supabase.from('contextual_data').insert([
      {
        user_id: testUserId,
        content: 'Usuário prefere dicas curtas e práticas',
        content_vector: null, // O trigger do banco será responsável por calcular o vetor
        source: 'preference',
        metadata: { priority: 'high' }
      },
      {
        user_id: testUserId,
        content: 'Usuário tem dificuldade com gerenciamento de tempo',
        content_vector: null,
        source: 'assessment',
        metadata: { area: 'time_management' }
      }
    ]);
  });
  
  // Limpar depois dos testes
  afterAll(async () => {
    await supabase.from('contextual_data').delete().eq('user_id', testUserId);
    await supabase.from('users').delete().eq('id', testUserId);
  });
  
  test('endpoint da API processa mensagens corretamente', async () => {
    // Simular requisição HTTP
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        userId: testUserId,
        message: 'Como posso organizar melhor meu tempo?'
      }
    });
    
    // Chamar o handler da API
    await assistantApiHandler(req, res);
    
    // Verificar resposta
    expect(res._getStatusCode()).toBe(200);
    
    const responseData = JSON.parse(res._getData());
    expect(responseData).toHaveProperty('response');
    expect(typeof responseData.response).toBe('string');
    expect(responseData.response.length).toBeGreaterThan(0);
  });
  
  test('respostas incluem contexto personalizado', async () => {
    const message = 'Preciso de ajuda para focar nas minhas tarefas';
    const response = await generateAssistantResponse(testUserId, message);
    
    // Verificar se a resposta contém elementos que indicam personalização
    expect(response).toMatch(/tempo|foco|dicas|curtas|práticas/i);
  });
});
```

### 3. Testes End-to-End

```typescript
// __tests__/e2e/assistant.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Assistente RAG', () => {
  test.beforeEach(async ({ page }) => {
    // Fazer login com usuário de teste
    await page.goto('/login');
    await page.fill('input[name="email"]', 'teste-e2e@example.com');
    await page.fill('input[name="password"]', 'senhateste123');
    await page.click('button[type="submit"]');
    
    // Navegar para a página do assistente
    await page.goto('/assistente');
  });
  
  test('interface do chat é renderizada corretamente', async ({ page }) => {
    // Verificar elementos principais da interface
    await expect(page.locator('.chat-container')).toBeVisible();
    await expect(page.locator('input[name="message"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
  
  test('envia mensagem e recebe resposta', async ({ page }) => {
    // Enviar uma mensagem
    await page.fill('input[name="message"]', 'Como posso melhorar meu foco?');
    await page.click('button[type="submit"]');
    
    // Verificar que a mensagem do usuário aparece na interface
    await expect(page.locator('.message-user')).toContainText('Como posso melhorar meu foco?');
    
    // Aguardar resposta do assistente (pode demorar alguns segundos)
    await expect(page.locator('.message-assistant')).toBeVisible({ timeout: 10000 });
    
    // Verificar que a resposta não está vazia
    const responseText = await page.locator('.message-assistant').textContent();
    expect(responseText?.length).toBeGreaterThan(10);
  });
  
  test('mensagens são persistidas após recarregar a página', async ({ page }) => {
    // Enviar mensagem
    await page.fill('input[name="message"]', 'Preciso de uma técnica de concentração');
    await page.click('button[type="submit"]');
    
    // Aguardar resposta
    await expect(page.locator('.message-assistant')).toBeVisible({ timeout: 10000 });
    
    // Recarregar página
    await page.reload();
    
    // Verificar que as mensagens anteriores ainda estão visíveis
    await expect(page.locator('.message-user')).toContainText('Preciso de uma técnica de concentração');
    await expect(page.locator('.message-assistant')).toBeVisible();
  });
});
```

## Ferramentas de Monitoramento

```typescript
// lib/rag/monitoring.ts
import { supabase } from '@/lib/supabaseServer';

interface RAGMetrics {
  userId: string;
  query: string;
  contextItems: number;
  responseLength: number;
  responseTime: number;
  feedbackScore?: number; // opcional, adicionado pelo usuário depois
}

export async function logRAGInteraction(metrics: RAGMetrics) {
  try {
    await supabase.from('assistant_metrics').insert({
      user_id: metrics.userId,
      query: metrics.query,
      context_items_count: metrics.contextItems,
      response_length: metrics.responseLength,
      response_time_ms: metrics.responseTime,
      feedback_score: metrics.feedbackScore
    });
  } catch (error) {
    console.error('Erro ao registrar métricas RAG:', error);
  }
}

export async function updateRAGFeedback(interactionId: string, score: number) {
  try {
    await supabase
      .from('assistant_metrics')
      .update({ feedback_score: score })
      .eq('id', interactionId);
  } catch (error) {
    console.error('Erro ao atualizar feedback RAG:', error);
  }
}
```

## Passos de Implementação

1. Configurar ambiente de testes com Jest e Playwright
2. Implementar testes unitários para componentes RAG
3. Criar testes de integração com banco de dados de teste
4. Desenvolver testes end-to-end para interface do usuário
5. Implementar sistema de monitoramento de qualidade do RAG

## Verificação

- [ ] Testes unitários passando com cobertura adequada
- [ ] Testes de integração validando fluxo completo
- [ ] Testes end-to-end verificando experiência do usuário
- [ ] Sistema de métricas coletando dados de uso
- [ ] Feedback do usuário sendo registrado e analisado

## Próximos Passos

- Implementação de análise continua de qualidade das respostas
- Desenvolvimento de dashboard de monitoramento RAG
- Otimização baseada em métricas de uso 