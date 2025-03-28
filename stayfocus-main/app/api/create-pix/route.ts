import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Mock de API do PIX
async function mockCreatePixCharge(
  amount: number,
  description: string,
  expirationMinutes: number = 30
) {
  // Simular delay de processamento
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Gerar txid aleatório
  const txid = uuidv4();
  
  // Data de expiração
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);
  
  // QR Code de exemplo (na implementação real, seria gerado pelo backend)
  const qrCodeSample = 'https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg';
  
  return {
    txid,
    qrcode: qrCodeSample,
    pixCopiaECola: '00020101021226930014br.gov.bcb.pix2571pix@example.com52040000530398654041.005802BR5903PIX6008BRASILIA62070503***63041234',
    status: 'ATIVA',
    valor: amount,
    expiresAt: expiresAt.toISOString()
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, description, userId, expirationMinutes } = body;
    
    if (!amount || !description || !userId) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }
    
    // Validar valor
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { error: 'Valor inválido' },
        { status: 400 }
      );
    }
    
    // Criar cobrança PIX (mock)
    const pixCharge = await mockCreatePixCharge(
      numericAmount,
      description,
      expirationMinutes || 30
    );
    
    // Na implementação real, registraria a cobrança no banco de dados
    
    // Retornar dados da cobrança PIX
    return NextResponse.json({
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
    
    return NextResponse.json(
      { error: 'Erro ao criar cobrança PIX' },
      { status: 500 }
    );
  }
} 