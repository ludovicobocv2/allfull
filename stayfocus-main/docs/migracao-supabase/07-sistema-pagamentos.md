# Fase 7: Sistema de Pagamentos PIX

## Objetivos
- Implementar sistema de pagamentos via PIX
- Configurar webhook para recebimento de notificações de pagamento
- Integrar pagamentos com sistema de assinaturas

## Componentes Principais

### 1. Geração de Cobranças PIX

```typescript
// lib/payments/pix-generator.ts
import { supabase } from '@/lib/supabaseServer';
import axios from 'axios';

interface PixPaymentRequest {
  userId: string;
  amount: number;
  description: string;
  expiresIn: number; // segundos
}

export async function generatePixPayment({
  userId,
  amount,
  description,
  expiresIn
}: PixPaymentRequest) {
  try {
    // Obter dados do usuário
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('id', userId)
      .single();
      
    if (userError || !userData) {
      throw new Error('Usuário não encontrado');
    }
    
    // Requisição para API do provedor de pagamento
    const paymentResponse = await axios.post(
      `${process.env.PAYMENT_PROVIDER_URL}/pix/charges`,
      {
        amount: amount * 100, // valor em centavos
        description,
        customer: {
          name: `${userData.first_name} ${userData.last_name}`,
          email: userData.email
        },
        expiresIn
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.PAYMENT_PROVIDER_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const paymentData = paymentResponse.data;
    
    // Salvar registro de cobrança no banco de dados
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        external_id: paymentData.id,
        amount,
        description,
        status: 'pending',
        payment_type: 'pix',
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        metadata: {
          qr_code: paymentData.qrcode,
          qr_code_image: paymentData.qrcode_image,
          pix_copy_paste: paymentData.copy_paste
        }
      })
      .select()
      .single();
      
    if (paymentError) {
      throw new Error('Erro ao registrar pagamento');
    }
    
    return paymentRecord;
  } catch (error) {
    console.error('Erro ao gerar cobrança PIX:', error);
    throw error;
  }
}
```

### 2. Webhook de Pagamentos

```typescript
// pages/api/payments/webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseServer';
import { buffer } from 'micro';
import crypto from 'crypto';

// Desabilitando o bodyParser para receber o payload raw
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Obter o payload bruto
    const rawBody = await buffer(req);
    const payload = JSON.parse(rawBody.toString());
    
    // Verificar assinatura do webhook
    const signature = req.headers['x-signature'] as string;
    const calculatedSignature = crypto
      .createHmac('sha256', process.env.PAYMENT_WEBHOOK_SECRET!)
      .update(rawBody)
      .digest('hex');
      
    if (signature !== calculatedSignature) {
      return res.status(403).json({ error: 'Assinatura inválida' });
    }
    
    // Processar notificação
    if (payload.event === 'payment.confirmed') {
      await processPaymentConfirmation(payload.data);
    } else if (payload.event === 'payment.expired') {
      await processPaymentExpiration(payload.data);
    }
    
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Erro ao processar webhook de pagamento:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
}

async function processPaymentConfirmation(paymentData: any) {
  const externalId = paymentData.id;
  
  // Atualizar registro de pagamento
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      metadata: {
        ...paymentData,
        transaction_id: paymentData.transaction_id
      }
    })
    .eq('external_id', externalId)
    .select('id, user_id, amount, description')
    .single();
    
  if (paymentError || !payment) {
    throw new Error('Erro ao atualizar pagamento');
  }
  
  // Verificar se é um pagamento de assinatura
  if (payment.description.includes('Assinatura')) {
    // Atualizar assinatura do usuário
    await supabase
      .from('subscriptions')
      .update({
        is_active: true,
        current_period_end: calculateNextPeriodEnd(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', payment.user_id);
  }
}

async function processPaymentExpiration(paymentData: any) {
  const externalId = paymentData.id;
  
  // Atualizar registro de pagamento
  await supabase
    .from('payments')
    .update({
      status: 'expired',
      updated_at: new Date().toISOString()
    })
    .eq('external_id', externalId);
}

function calculateNextPeriodEnd() {
  // Calcular data de término do próximo período (30 dias)
  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 30);
  return nextMonth.toISOString();
}
```

### 3. Componente de Pagamento

```typescript
// components/PixPayment.tsx
import React, { useState } from 'react';
import Image from 'next/image';
import { generatePixPayment } from '@/lib/api/payments';

export default function PixPayment({ 
  userId,
  amount,
  description,
  onSuccess
}: {
  userId: string;
  amount: number;
  description: string;
  onSuccess?: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleGeneratePayment = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await generatePixPayment({
        userId,
        amount,
        description,
        expiresIn: 3600 // 1 hora
      });
      
      setPaymentData(response);
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar pagamento');
    } finally {
      setIsLoading(false);
    }
  };
  
  const copyPixCode = () => {
    if (paymentData?.metadata?.pix_copy_paste) {
      navigator.clipboard.writeText(paymentData.metadata.pix_copy_paste);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Pagamento via PIX</h2>
      
      {!paymentData && (
        <button
          onClick={handleGeneratePayment}
          disabled={isLoading}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-full"
        >
          {isLoading ? 'Gerando...' : 'Gerar PIX'}
        </button>
      )}
      
      {error && (
        <div className="text-red-500 mt-2">{error}</div>
      )}
      
      {paymentData && (
        <div className="flex flex-col items-center">
          <div className="mb-4 text-center">
            <p className="font-medium">Valor: R$ {(paymentData.amount).toFixed(2)}</p>
            <p className="text-sm text-gray-600">
              Escaneie o QR Code ou copie o código PIX abaixo
            </p>
          </div>
          
          {paymentData.metadata.qr_code_image && (
            <div className="mb-4">
              <Image 
                src={paymentData.metadata.qr_code_image} 
                alt="QR Code PIX"
                width={200}
                height={200}
              />
            </div>
          )}
          
          <div className="w-full">
            <button
              onClick={copyPixCode}
              className="bg-gray-100 border border-gray-300 rounded px-4 py-2 text-sm w-full hover:bg-gray-200"
            >
              Copiar código PIX
            </button>
          </div>
          
          <p className="text-sm text-gray-500 mt-4">
            O pagamento expira em 1 hora. Após o pagamento, sua conta será atualizada automaticamente.
          </p>
        </div>
      )}
    </div>
  );
}
```

## Variáveis de Ambiente Necessárias

```
PAYMENT_PROVIDER_URL=https://api.seuprovedor.com
PAYMENT_PROVIDER_KEY=sua_chave_de_api
PAYMENT_WEBHOOK_SECRET=seu_segredo_webhook
```

## Passos de Implementação

1. Configurar conta no provedor de pagamentos PIX
2. Implementar geração de cobranças PIX
3. Configurar webhook para recebimento de notificações
4. Desenvolver componentes de interface para pagamento
5. Integrar sistema de assinaturas

## Verificação

- [ ] Cobranças PIX sendo geradas corretamente
- [ ] QR Codes sendo exibidos na interface
- [ ] Webhook recebendo e processando notificações
- [ ] Sistema de assinaturas atualizando após pagamento
- [ ] Histórico de pagamentos registrado no Supabase

## Próximos Passos

- Implementação de relatórios financeiros
- Sistema de cupons e descontos
- Integração com outros métodos de pagamento 