import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { processRagMessage, detectUserIntent } from './ragEngine';
import { saveAssistantConversation } from './supabaseClient';

let whatsappClient: Client | null = null;

// Função para inicializar cliente WhatsApp
export async function initWhatsAppClient() {
  // Verifica se o cliente já está inicializado
  if (whatsappClient) {
    return whatsappClient;
  }

  // Cria novo cliente
  whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  // Configurar evento de QR Code
  whatsappClient.on('qr', (qr) => {
    console.log('QR CODE para conexão do WhatsApp:');
    qrcode.generate(qr, { small: true });
  });

  // Configurar evento de pronto
  whatsappClient.on('ready', () => {
    console.log('Cliente WhatsApp está pronto!');
  });

  // Configurar manipulador de mensagens
  whatsappClient.on('message', async (msg) => {
    if (msg.from.includes('@c.us')) { // Filtra mensagens de contatos
      await handleIncomingMessage(msg.from, msg.body);
    }
  });

  // Inicializar cliente
  await whatsappClient.initialize();
  
  return whatsappClient;
}

// Função para gerenciar mensagens recebidas
async function handleIncomingMessage(fromNumber: string, messageText: string) {
  try {
    // Extrair ID do usuário do número (na implementação real, teria lógica de mapeamento de contatos)
    const userId = await getUserIdFromWhatsAppNumber(fromNumber);
    
    if (!userId) {
      await sendWhatsAppMessage(fromNumber, 'Desculpe, não foi possível identificar seu cadastro. Por favor, acesse o aplicativo StayFocus para configurar seu WhatsApp.');
      return;
    }
    
    // Detectar intenção do usuário
    const intent = detectUserIntent(messageText);
    
    // Processar mensagem usando RAG
    const processedResponse = await processRagMessage(userId, messageText, { intent });
    
    // Salvar conversa no banco de dados
    await saveAssistantConversation({
      userId,
      message: messageText,
      response: processedResponse.response,
      contextData: { intent, fromWhatsApp: true },
      timestamp: new Date().toISOString()
    });
    
    // Enviar resposta
    await sendWhatsAppMessage(fromNumber, processedResponse.response);
    
  } catch (error) {
    console.error('Erro ao processar mensagem do WhatsApp:', error);
    
    // Enviar mensagem de erro
    await sendWhatsAppMessage(fromNumber, 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente mais tarde.');
  }
}

// Função para enviar mensagem via WhatsApp
export async function sendWhatsAppMessage(to: string, message: string) {
  try {
    // Garante que o cliente está inicializado
    const client = await initWhatsAppClient();
    
    // Envia mensagem
    await client.sendMessage(to, message);
    
    return true;
  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error);
    return false;
  }
}

// Função para mapear número WhatsApp para ID de usuário
async function getUserIdFromWhatsAppNumber(phoneNumber: string): Promise<string | null> {
  // Aqui iria a lógica para buscar o ID do usuário pelo número do WhatsApp
  // Na implementação real, isso consultaria o banco de dados
  
  // Exemplo simples:
  const cleanNumber = phoneNumber.replace('@c.us', '');
  
  // Simulação: na implementação real, isso buscaria no Supabase
  // Consultar tabela de usuários onde o campo telefone corresponde ao número
  return `user_${cleanNumber.substring(cleanNumber.length - 6)}`;
} 