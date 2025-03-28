import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, phoneNumber } = body;
    
    if (!userId || !phoneNumber) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }
    
    // Validar formato do número de telefone
    if (!isValidPhoneNumber(phoneNumber)) {
      return NextResponse.json(
        { error: 'Número de telefone inválido' },
        { status: 400 }
      );
    }
    
    // Formatar número de telefone para o formato esperado pelo WhatsApp
    const formattedNumber = formatPhoneNumber(phoneNumber);
    
    // Aqui seria implementada a lógica para salvar no Supabase
    // Por enquanto, simulamos uma resposta de sucesso
    
    // Simular delay de processamento
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Retornar resposta de sucesso
    return NextResponse.json({ 
      success: true,
      message: 'Número de WhatsApp configurado com sucesso',
      phoneNumber: formattedNumber
    });
    
  } catch (error) {
    console.error('Erro ao configurar WhatsApp:', error);
    
    return NextResponse.json(
      { error: 'Erro interno ao configurar WhatsApp' },
      { status: 500 }
    );
  }
} 