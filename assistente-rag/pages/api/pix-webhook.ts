import { NextApiRequest, NextApiResponse } from 'next';
import { processPixWebhook } from '../../lib/pixIntegration';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apenas aceitar requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    // Validar autenticação do webhook (na implementação real, isso seria mais robusto)
    const authHeader = req.headers.authorization;
    if (!authHeader || !verifyPixWebhookAuth(authHeader)) {
      return res.status(401).json({ error: 'Não autorizado' });
    }
    
    // Processar dados do webhook
    const webhookData = req.body;
    const success = await processPixWebhook(webhookData);
    
    if (!success) {
      return res.status(400).json({ error: 'Falha ao processar webhook' });
    }
    
    // Retornar resposta de sucesso
    return res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('Erro ao processar webhook PIX:', error);
    return res.status(500).json({ error: 'Erro interno ao processar webhook' });
  }
}

// Função para verificar autenticação do webhook (simulação)
function verifyPixWebhookAuth(authHeader: string): boolean {
  // Na implementação real, isso verificaria o token/chave de autenticação do webhook
  // Para este exemplo, apenas verifica se há um valor no cabeçalho
  return authHeader.startsWith('Bearer ') && authHeader.length > 10;
} 