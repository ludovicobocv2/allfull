import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simulação de envio para WhatsApp
async function mockSendWhatsApp(userId: string, message: string) {
  // Simular delay de processamento
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulação: 95% de chance de sucesso
  const isSuccess = Math.random() < 0.95;
  
  if (!isSuccess) {
    throw new Error('Falha no envio da mensagem');
  }
  
  return {
    success: true,
    messageId: `msg_${Date.now()}`,
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
    
    // Na implementação real:
    // 1. Buscaria o número de WhatsApp do usuário no banco de dados
    // 2. Verificaria se está configurado
    // 3. Enviaria a mensagem usando a biblioteca WhatsApp
    
    // Simulação de envio
    const result = await mockSendWhatsApp(userId, message);
    
    // Retornar resultado
    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      timestamp: result.timestamp
    });
    
  } catch (error) {
    console.error('Erro ao enviar mensagem por WhatsApp:', error);
    
    return NextResponse.json(
      { error: 'Erro ao enviar mensagem por WhatsApp' },
      { status: 500 }
    );
  }
} 