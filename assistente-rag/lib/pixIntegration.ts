import axios from 'axios';

// Configurações para integração PIX
const PIX_API_BASE_URL = process.env.PIX_API_BASE_URL || '';
const PIX_API_CLIENT_ID = process.env.PIX_API_CLIENT_ID || '';
const PIX_API_CLIENT_SECRET = process.env.PIX_API_CLIENT_SECRET || '';

// Interface para resposta de criação de cobrança
interface PixChargeResponse {
  txid: string;
  qrcode: string;
  pixCopiaECola: string; // Pix Copia e Cola (texto)
  status: string;
  valor: number;
  expiresAt: string;
}

// Função para obter token de autorização
async function getPixApiToken() {
  try {
    const response = await axios.post(
      `${PIX_API_BASE_URL}/oauth/token`,
      {
        grant_type: 'client_credentials'
      },
      {
        auth: {
          username: PIX_API_CLIENT_ID,
          password: PIX_API_CLIENT_SECRET
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.access_token;
  } catch (error) {
    console.error('Erro ao obter token PIX:', error);
    throw new Error('Falha na autenticação com API PIX');
  }
}

// Função para criar cobrança PIX
export async function createPixCharge(
  value: number,
  description: string,
  expirationMinutes: number = 30
): Promise<PixChargeResponse> {
  try {
    // Obter token de acesso
    const token = await getPixApiToken();
    
    // Gerar ID de transação único
    const txid = generateTxId();
    
    // Definir data de expiração
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);
    
    // Criar payload da cobrança
    const chargePayload = {
      calendario: {
        expiracao: expirationMinutes * 60 // Convertido para segundos
      },
      devedor: {
        // Neste exemplo, são opcionais. Num sistema real, seriam informados
        // cpf ou cnpj: '',
        // nome: '',
      },
      valor: {
        original: value.toFixed(2)
      },
      chave: process.env.PIX_API_KEY || '', // Chave PIX da conta recebedora
      solicitacaoPagador: description,
      infoAdicionais: [
        {
          nome: 'StayFocus',
          valor: 'Pagamento Assistente'
        }
      ]
    };
    
    // Enviar requisição para criar cobrança
    const response = await axios.put(
      `${PIX_API_BASE_URL}/v2/cob/${txid}`,
      chargePayload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Obter QR Code para a cobrança
    const qrCodeResponse = await axios.get(
      `${PIX_API_BASE_URL}/v2/loc/${response.data.loc.id}/qrcode`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    // Retornar dados da cobrança
    return {
      txid: response.data.txid,
      qrcode: qrCodeResponse.data.imagemQrcode,
      pixCopiaECola: qrCodeResponse.data.qrcode,
      status: response.data.status,
      valor: parseFloat(response.data.valor.original),
      expiresAt: response.data.calendario.expiracao
    };
  } catch (error) {
    console.error('Erro ao criar cobrança PIX:', error);
    throw new Error('Falha ao criar cobrança PIX');
  }
}

// Função para verificar status de pagamento PIX
export async function checkPixPaymentStatus(txid: string): Promise<string> {
  try {
    // Obter token de acesso
    const token = await getPixApiToken();
    
    // Consultar status da cobrança
    const response = await axios.get(
      `${PIX_API_BASE_URL}/v2/cob/${txid}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return response.data.status;
  } catch (error) {
    console.error('Erro ao verificar status do pagamento PIX:', error);
    throw new Error('Falha ao verificar status do pagamento');
  }
}

// Função para gerar ID de transação único
function generateTxId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Função para processar webhook de notificação PIX
export async function processPixWebhook(webhookData: any): Promise<boolean> {
  try {
    const { pix } = webhookData;
    
    if (!pix || !Array.isArray(pix)) {
      console.error('Dados de webhook PIX inválidos');
      return false;
    }
    
    // Processar cada notificação PIX recebida
    for (const pixNotification of pix) {
      // Aqui teria a lógica para atualizar o status do pagamento no sistema
      // e creditar o valor para o usuário ou ativar sua assinatura
      console.log('Pagamento PIX recebido:', pixNotification);
      
      // Exemplo: atualizar status de assinatura do usuário
      // await updateUserSubscription(pixNotification.txid);
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao processar webhook PIX:', error);
    return false;
  }
} 