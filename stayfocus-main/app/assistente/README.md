# Módulo Assistente Virtual RAG para StayFocus

Este módulo implementa um assistente virtual personalizado baseado em RAG (Retrieval Augmented Generation) para a aplicação StayFocus, com foco específico em auxiliar usuários neurodivergentes.

## Componentes Disponíveis

- **AssistantChat**: Componente de chat para interação com o assistente virtual
- **WhatsAppSetup**: Componente para configuração de notificações via WhatsApp
- **PixPayment**: Componente para processamento de pagamentos via PIX

## Requisitos

- Next.js 14.0.0 ou superior
- React 18.2.0 ou superior
- Supabase para armazenamento de dados
- APIs compatíveis para integração com WhatsApp e PIX (simuladas neste exemplo)

## Como Usar

### 1. Importação dos Componentes

Os componentes podem ser importados diretamente nas páginas e componentes existentes:

```tsx
import AssistantChat from '@/app/assistente/components/AssistantChat';
import WhatsAppSetup from '@/app/assistente/components/WhatsAppSetup';
import PixPayment from '@/app/assistente/components/PixPayment';
```

### 2. Exemplos de Uso

#### Chat do Assistente

```tsx
<AssistantChat 
  userId={userId} 
  onSendToWhatsApp={handleSendToWhatsApp} 
/>
```

#### Configuração de WhatsApp

```tsx
<WhatsAppSetup 
  userId={userId} 
  onSetupComplete={handleWhatsAppSetupComplete} 
/>
```

#### Pagamentos PIX

```tsx
<PixPayment
  userId={userId}
  amount={49.90}
  description="Assinatura Premium - StayFocus"
  onSuccess={handlePaymentSuccess}
  onCancel={handleCancelPayment}
/>
```

## Integração com Hiperfocos

O assistente RAG pode ser particularmente útil na seção de hiperfocos, ajudando a regular interesses intensos:

```tsx
import { useState } from 'react';
import AssistantChat from '@/app/assistente/components/AssistantChat';

export default function HiperfocosPage() {
  const userId = "user_123"; // Obter de autenticação/contexto
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-2">
        {/* Conteúdo existente da página de hiperfocos */}
      </div>
      
      <div className="md:col-span-1 h-[600px]">
        <AssistantChat 
          userId={userId}
          initialMessages={[
            {
              id: 'initial',
              isUser: false,
              text: 'Estou aqui para ajudar com seu hiperfoco. Como posso auxiliar na regulação ou organização deste interesse?',
              timestamp: new Date().toISOString()
            }
          ]}
        />
      </div>
    </div>
  );
}
```

## Personalização

Os componentes utilizam as variáveis de tema do StayFocus e se adaptam automaticamente aos modos claro/escuro. As cores principais são baseadas no esquema de cores do tema de hiperfocos.

## APIs Backend

As seguintes rotas de API são implementadas:

- **/api/rag-assistant**: Processa mensagens enviadas ao assistente
- **/api/setup-whatsapp**: Configura número de WhatsApp do usuário
- **/api/create-pix**: Cria cobranças PIX para assinaturas
- **/api/check-pix-status**: Verifica status de pagamentos PIX

## Configuração do Banco de Dados

Para armazenar os dados do assistente, são necessárias as seguintes tabelas no Supabase:

- **conversas_assistente**: Armazena histórico de conversas
- **assinaturas**: Registra assinaturas e pagamentos
- **usuarios**: Inclui campo `whatsapp_number` para integração

## Notas de Implementação

- Esta versão inclui simulações das APIs de PIX e WhatsApp
- Para implementação em produção, substitua as funções mock pelas integrações reais
- O processamento RAG está simplificado; em produção, use a biblioteca completa assistente-rag 