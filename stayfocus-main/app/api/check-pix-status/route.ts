import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simular verificação de status do PIX
async function mockCheckPixStatus(txid: string): Promise<string> {
  // Simulação: 20% de chance de pagamento confirmado após o primeiro check
  const randomOutcome = Math.random();
  
  // Simular delay de processamento
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Verificar se temos um status salvo no localStorage (na versão do servidor, seria um banco de dados)
  const storedStatus = global.pixStatuses?.[txid];
  
  if (storedStatus === 'CONCLUIDA') {
    return 'CONCLUIDA';
  }
  
  // Simular mudança de status
  if (randomOutcome < 0.2) {
    // Salvar status no objeto global (simulação)
    if (!global.pixStatuses) {
      global.pixStatuses = {};
    }
    global.pixStatuses[txid] = 'CONCLUIDA';
    
    return 'CONCLUIDA';
  }
  
  return 'ATIVA';
}

export async function GET(request: NextRequest) {
  try {
    const txid = request.nextUrl.searchParams.get('txid');
    
    if (!txid) {
      return NextResponse.json(
        { error: 'ID da transação não informado' },
        { status: 400 }
      );
    }
    
    // Verificar status do pagamento
    const status = await mockCheckPixStatus(txid);
    
    // Retornar status
    return NextResponse.json({
      success: true,
      txid,
      status
    });
    
  } catch (error) {
    console.error('Erro ao verificar status do pagamento PIX:', error);
    
    return NextResponse.json(
      { error: 'Erro ao verificar status do pagamento' },
      { status: 500 }
    );
  }
} 