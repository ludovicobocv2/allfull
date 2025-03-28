import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';
import {
  getUserData,
  getFinancialData,
  getUserPreferences,
  getHyperfocusHistory
} from './supabaseClient';

// Inicializa cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Interface para dados de contexto
interface ContextData {
  userData: any;
  financialData: any;
  preferences: any;
  hyperfocusHistory: any;
  [key: string]: any;
}

// Função para processar mensagem do usuário usando RAG
export async function processRagMessage(
  userId: string,
  message: string,
  additionalContext: any = {}
) {
  try {
    // Recupera dados do usuário para contextualização
    const userData = await getUserData(userId);
    const financialData = await getFinancialData(userId);
    const preferences = await getUserPreferences(userId);
    const hyperfocusHistory = await getHyperfocusHistory(userId);
    
    // Compila dados para contexto
    const contextData: ContextData = {
      userData,
      financialData,
      preferences,
      hyperfocusHistory,
      ...additionalContext
    };
    
    // Preparar prompt para o modelo
    const systemPrompt = createSystemPrompt(contextData);
    
    // Gerar resposta usando modelo LLM
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',  // ou um modelo mais leve conforme necessário
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    });
    
    // Extrair e retornar resposta
    const response = completion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua solicitação.';
    
    return {
      id: uuidv4(),
      userId,
      message,
      response,
      contextData,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Erro ao processar mensagem RAG:', error);
    throw error;
  }
}

// Função para criar prompt de sistema com contexto
function createSystemPrompt(contextData: ContextData): string {
  // Extrair dados financeiros relevantes
  const envelopes = contextData.financialData || [];
  const hiperfocoEnvelope = envelopes.find((env: any) => env.tipo === 'hiperfoco') || { saldo: 0 };
  
  // Extrair histórico de hiperfocos
  const hyperfocusHistory = contextData.hyperfocusHistory || [];
  
  // Construir prompt com dados contextualizados
  return `
    Você é um assistente pessoal especializado para pessoas neurodivergentes, especialmente aquelas com TDAH.
    Sua função é fornecer suporte personalizado baseado nos dados e preferências do usuário.
    
    INFORMAÇÕES DO USUÁRIO:
    - Nome: ${contextData.userData?.nome || 'Usuário'}
    - Preferências de comunicação: ${contextData.preferences?.estilo_comunicacao || 'direto e claro'}
    - Saldo em envelope para hiperfocos: R$${hiperfocoEnvelope.saldo || 0}
    
    HISTÓRICO DE HIPERFOCOS:
    ${hyperfocusHistory.length > 0 
      ? hyperfocusHistory.slice(0, 3).map((h: any) => `- ${h.titulo} (iniciado em ${formatDate(h.data_inicio)}, orçamento: R$${h.orcamento})`).join('\n') 
      : '- Sem hiperfocos registrados recentemente'}
    
    DIRETRIZES DE RESPOSTA:
    1. Forneça respostas claras e diretas
    2. Ajude o usuário com divisão de tarefas para reduzir carga cognitiva
    3. Ofereça sugestões baseadas em dados financeiros quando relevante
    4. Apoie na gestão de hiperfocos, considerando o histórico do usuário
    5. Personalize suas respostas para atender às necessidades específicas do TDAH
    6. Seja conciso mas completo
    7. Use linguagem acessível

    Ao responder perguntas sobre gastos ou compras, sempre considere o saldo disponível nos envelopes correspondentes.
    
    Crie respostas que sejam úteis, personalizadas e adaptadas às necessidades do usuário.
  `;
}

// Função para formatar data
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  } catch (error) {
    return dateString || 'data desconhecida';
  }
}

// Função para detectar intenção do usuário
export function detectUserIntent(message: string): string {
  const lowercaseMessage = message.toLowerCase();
  
  if (lowercaseMessage.includes('hiperfoco') || lowercaseMessage.includes('foco intenso')) {
    return 'hiperfoco';
  }
  
  if (lowercaseMessage.includes('regulação cognitiva') || lowercaseMessage.includes('sobrecarga')) {
    return 'regulacao_cognitiva';
  }
  
  if (lowercaseMessage.includes('financ') || lowercaseMessage.includes('dinheiro') || lowercaseMessage.includes('gasto')) {
    return 'financas';
  }
  
  if (lowercaseMessage.includes('sono') || lowercaseMessage.includes('dormir')) {
    return 'sono';
  }
  
  if (lowercaseMessage.includes('alimentação') || lowercaseMessage.includes('comer')) {
    return 'alimentacao';
  }
  
  return 'geral';
} 