import { NextApiRequest, NextApiResponse } from 'next';
import { initWhatsAppClient } from '../../lib/whatsappClient';
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    const { userId, phoneNumber } = req.body;
    
    if (!userId || !phoneNumber) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }
    
    // Validar formato do número de telefone
    if (!isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({ error: 'Número de telefone inválido' });
    }
    
    // Formatar número de telefone para o formato esperado pelo WhatsApp
    const formattedNumber = formatPhoneNumber(phoneNumber);
    
    // Salvar/atualizar número de telefone do usuário no banco de dados
    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ whatsapp_number: formattedNumber })
      .eq('id', userId);
    
    if (updateError) {
      console.error('Erro ao atualizar número de WhatsApp:', updateError);
      return res.status(500).json({ error: 'Falha ao atualizar número de WhatsApp' });
    }
    
    // Inicializar cliente WhatsApp (se ainda não inicializado)
    await initWhatsAppClient();
    
    // Retornar resposta de sucesso
    return res.status(200).json({ 
      success: true,
      message: 'Número de WhatsApp configurado com sucesso',
      phoneNumber: formattedNumber
    });
    
  } catch (error) {
    console.error('Erro ao configurar WhatsApp:', error);
    return res.status(500).json({ error: 'Erro interno ao configurar WhatsApp' });
  }
}

// Função para validar formato de número de telefone
function isValidPhoneNumber(phoneNumber: string): boolean {
  // Validação básica: apenas dígitos, com tamanho mínimo de 10 (DDD + número)
  return /^\d{10,15}$/.test(phoneNumber.replace(/\D/g, ''));
}

// Função para formatar número de telefone para padrão WhatsApp
function formatPhoneNumber(phoneNumber: string): string {
  // Remover caracteres não numéricos
  const numbers = phoneNumber.replace(/\D/g, '');
  
  // Se não começar com código do país, adicionar 55 (Brasil)
  const withCountryCode = numbers.startsWith('55') ? numbers : `55${numbers}`;
  
  // Retornar no formato esperado pelo WhatsApp
  return `${withCountryCode}@c.us`;
} 