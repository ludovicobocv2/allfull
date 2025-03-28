import { NextApiRequest, NextApiResponse } from 'next';
import { processRagMessage } from '../../lib/ragEngine';
import { saveAssistantConversation } from '../../lib/supabaseClient';
import { sendWhatsAppMessage } from '../../lib/whatsappClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    const { userId, message, sendToWhatsApp } = req.body;
    
    if (!userId || !message) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }
    
    // Processar mensagem usando RAG
    const processedResponse = await processRagMessage(userId, message);
    
    // Salvar conversa no banco de dados
    await saveAssistantConversation({
      userId,
      message,
      response: processedResponse.response,
      contextData: processedResponse.contextData,
      timestamp: new Date().toISOString()
    });
    
    // Se solicitado, enviar mensagem via WhatsApp
    if (sendToWhatsApp) {
      // Aqui precisaria buscar o número de WhatsApp do usuário
      const userWhatsappNumber = await getUserWhatsAppNumber(userId);
      
      if (userWhatsappNumber) {
        await sendWhatsAppMessage(userWhatsappNumber, processedResponse.response);
      }
    }
    
    // Retornar resposta processada
    return res.status(200).json({
      success: true,
      message: processedResponse.response,
      conversationId: processedResponse.id,
      timestamp: processedResponse.timestamp
    });
    
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
    return res.status(500).json({ error: 'Erro ao processar mensagem' });
  }
}

// Função para obter número de WhatsApp do usuário (simulação)
async function getUserWhatsAppNumber(userId: string): Promise<string | null> {
  // Na implementação real, isso consultaria o banco de dados
  // Exemplo simulado:
  return userId.startsWith('user_') ? `55${Math.floor(Math.random() * 90000000) + 10000000}@c.us` : null;
} 