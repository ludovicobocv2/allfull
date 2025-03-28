# Fase 6: Integração WhatsApp

## Objetivos
- Implementar integração com WhatsApp Business API
- Desenvolver sistema de notificações personalizadas
- Criar mecanismos de interação com o assistente RAG via WhatsApp

## Componentes Principais

### 1. Configuração do Webhook

```typescript
// pages/api/whatsapp/webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseServer';
import { processWhatsAppMessage } from '@/lib/whatsapp/processor';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificação do token para validação do webhook
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    } else {
      return res.status(403).end();
    }
  }

  // Processamento de mensagens recebidas
  if (req.method === 'POST') {
    const body = req.body;

    try {
      if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry) {
          for (const change of entry.changes) {
            if (change.field === 'messages') {
              for (const message of change.value.messages || []) {
                await processWhatsAppMessage(message, change.value.metadata);
              }
            }
          }
        }
      }
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Erro ao processar mensagem do WhatsApp:', error);
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
```

### 2. Processador de Mensagens

```typescript
// lib/whatsapp/processor.ts
import { supabase } from '@/lib/supabaseServer';
import { generateAssistantResponse } from '@/lib/rag/processor';
import { sendWhatsAppMessage } from './sender';

export async function processWhatsAppMessage(message: any, metadata: any) {
  const { from, id, timestamp, text } = message;
  const phoneNumber = from;
  
  // Verificar se o número está associado a um usuário
  const { data: userData, error } = await supabase
    .from('users')
    .select('id, first_name')
    .eq('phone', phoneNumber)
    .single();
  
  if (error || !userData) {
    // Usuário não encontrado, enviar mensagem de boas-vindas/registro
    return sendWhatsAppMessage(
      phoneNumber,
      'Olá! Para usar o StayFocus via WhatsApp, você precisa estar registrado. Visite nosso site para se cadastrar.'
    );
  }
  
  // Salvar mensagem no histórico
  await supabase.from('assistant_conversations').insert({
    user_id: userData.id,
    sender: 'user',
    content: text.body,
    channel: 'whatsapp',
    metadata: { message_id: id, timestamp }
  });
  
  // Gerar resposta do assistente
  const assistantResponse = await generateAssistantResponse(userData.id, text.body);
  
  // Salvar resposta do assistente
  await supabase.from('assistant_conversations').insert({
    user_id: userData.id,
    sender: 'assistant',
    content: assistantResponse,
    channel: 'whatsapp'
  });
  
  // Enviar resposta via WhatsApp
  await sendWhatsAppMessage(phoneNumber, assistantResponse);
}
```

### 3. Envio de Mensagens

```typescript
// lib/whatsapp/sender.ts
import axios from 'axios';

export async function sendWhatsAppMessage(to: string, message: string) {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: message }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error);
    throw error;
  }
}

// Função para enviar notificações programadas
export async function sendScheduledNotification(userId: string, message: string) {
  try {
    // Buscar número de telefone do usuário
    const { data: userData, error } = await supabase
      .from('users')
      .select('phone')
      .eq('id', userId)
      .single();
      
    if (error || !userData?.phone) {
      throw new Error('Usuário não encontrado ou sem telefone cadastrado');
    }
    
    return sendWhatsAppMessage(userData.phone, message);
  } catch (error) {
    console.error('Erro ao enviar notificação programada:', error);
    throw error;
  }
}
```

## Variáveis de Ambiente Necessárias

```
WHATSAPP_ACCESS_TOKEN=seu_token_aqui
WHATSAPP_PHONE_NUMBER_ID=seu_id_de_telefone
WHATSAPP_VERIFY_TOKEN=seu_token_de_verificacao
```

## Passos de Implementação

1. Criar conta na plataforma WhatsApp Business
2. Configurar webhook para recebimento de mensagens
3. Implementar endpoint para processamento de mensagens
4. Desenvolver integração com o assistente RAG
5. Configurar sistema de notificações personalizadas

## Verificação

- [ ] Webhook respondendo corretamente às solicitações do WhatsApp
- [ ] Mensagens sendo recebidas e processadas
- [ ] Respostas do assistente sendo enviadas corretamente
- [ ] Notificações programadas sendo entregues
- [ ] Dados de conversas sendo armazenados no Supabase

## Próximos Passos

- Implementação de templates de mensagem ricos
- Sistema de mensagens de lembrete inteligentes
- Recursos de acessibilidade para usuários neurodivergentes via WhatsApp 