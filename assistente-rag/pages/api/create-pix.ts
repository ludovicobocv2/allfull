import { NextApiRequest, NextApiResponse } from 'next';
import { createPixCharge } from '../../lib/pixIntegration';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    const { amount, description, userId, expirationMinutes } = req.body;
    
    if (!amount || !description || !userId) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }
    
    // Validar valor
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }
    
    // Criar cobrança PIX
    const pixCharge = await createPixCharge(
      numericAmount,
      description,
      expirationMinutes || 30
    );
    
    // Registrar cobrança no banco de dados (isso seria implementado no projeto real)
    // await savePixCharge({ ...pixCharge, userId });
    
    // Retornar dados da cobrança PIX
    return res.status(200).json({
      success: true,
      data: {
        txid: pixCharge.txid,
        qrcode: pixCharge.qrcode,
        pixCopiaECola: pixCharge.pixCopiaECola,
        value: pixCharge.valor,
        expiresAt: pixCharge.expiresAt
      }
    });
    
  } catch (error) {
    console.error('Erro ao criar cobrança PIX:', error);
    return res.status(500).json({ error: 'Erro ao criar cobrança PIX' });
  }
} 