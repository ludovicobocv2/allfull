import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Simulação de processamento RAG (na implementação real, usaria a biblioteca assistente-rag)
async function processMessage(userId: string, message: string) {
  // Simular delay de processamento
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Respostas simuladas baseadas em palavras-chave
  if (message.toLowerCase().includes('tdah')) {
    return {
      id: uuidv4(),
      message: `Entendo suas preocupações sobre TDAH. É comum sentir-se sobrecarregado com múltiplas tarefas. Vamos dividir isso em etapas menores e organizá-las por prioridade e interesse. Qual área específica está te causando mais dificuldade no momento?`,
      timestamp: new Date().toISOString()
    };
  }
  
  if (message.toLowerCase().includes('hiperfoco')) {
    return {
      id: uuidv4(),
      message: `O hiperfoco é uma característica comum do TDAH. Ele pode ser muito produtivo quando direcionado a algo útil! Podemos trabalhar em estratégias para aproveitar seus períodos de hiperfoco em projetos importantes, enquanto estabelecemos limites de tempo saudáveis. Você identificou algum padrão nos seus hiperfocos recentes?`,
      timestamp: new Date().toISOString()
    };
  }
  
  if (message.toLowerCase().includes('organizar') || message.toLowerCase().includes('organização')) {
    return {
      id: uuidv4(),
      message: `Organização pode ser desafiadora, mas temos algumas estratégias que funcionam bem para pessoas neurodivergentes. Sistemas visuais, lembretes externos e rotinas simplificadas geralmente são mais eficazes que métodos tradicionais. Podemos começar com uma área específica que está te causando mais estresse?`,
      timestamp: new Date().toISOString()
    };
  }
  
  if (message.toLowerCase().includes('ansiedade') || message.toLowerCase().includes('estresse')) {
    return {
      id: uuidv4(),
      message: `A ansiedade frequentemente acompanha o TDAH. Algumas técnicas de regulação que podem ajudar incluem respiração profunda, exercícios de aterramento sensorial, e dividir tarefas grandes em passos menores. Lembre-se que é normal precisar de abordagens diferentes das neurotípicas para gerenciar a ansiedade.`,
      timestamp: new Date().toISOString()
    };
  }
  
  if (message.toLowerCase().includes('whatsapp')) {
    return {
      id: uuidv4(),
      message: `Você pode configurar a integração com WhatsApp na aba "WhatsApp" do assistente. Isso permitirá que você receba notificações e interaja comigo diretamente pelo aplicativo. É uma maneira conveniente de manter o suporte acessível onde você já está acostumado a se comunicar.`,
      timestamp: new Date().toISOString()
    };
  }
  
  if (message.toLowerCase().includes('financ') || message.toLowerCase().includes('dinheiro') || message.toLowerCase().includes('gasto')) {
    return {
      id: uuidv4(),
      message: `Gerenciar finanças pode ser desafiador com TDAH. O StayFocus tem ferramentas específicas para ajudar com o rastreamento de gastos e orçamento. Recomendo começar com um sistema simples de "envelopes" para diferentes categorias de gastos e estabelecer lembretes automáticos para contas. Gostaria que eu te explicasse mais sobre como usar a função de envelopes financeiros?`,
      timestamp: new Date().toISOString()
    };
  }
  
  // Resposta genérica
  return {
    id: uuidv4(),
    message: `Obrigado por sua mensagem. Como posso ajudar você hoje com seus objetivos, tarefas ou hiperfocos? Estou aqui para ajudar com estratégias personalizadas para seu cérebro neurodivergente.`,
    timestamp: new Date().toISOString()
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, message } = body;
    
    if (!userId || !message) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }
    
    // Processar mensagem com assistente RAG
    const response = await processMessage(userId, message);
    
    return NextResponse.json({
      success: true,
      message: response.message,
      conversationId: response.id,
      timestamp: response.timestamp
    });
    
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
    
    return NextResponse.json(
      { error: 'Erro ao processar mensagem' },
      { status: 500 }
    );
  }
} 