# Assistente Virtual RAG para StayFocus

Este projeto implementa um assistente virtual personalizado baseado em RAG (Retrieval Augmented Generation) para o aplicativo StayFocus, focado em atender às necessidades de usuários neurodivergentes.

## Recursos Principais

- **Assistente RAG Personalizado**: Respostas contextualizadas com base nos dados do usuário
- **Integração com WhatsApp**: Interação com o assistente via WhatsApp
- **Suporte a PIX**: Processamento de pagamentos via PIX para assinaturas
- **Gerenciamento de Hiperfocos**: Assistência para regulação cognitiva e controle de hiperfocos

## Tecnologias Utilizadas

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **IA/RAG**: OpenAI, Langchain
- **Integrações**: WhatsApp Web.js, API PIX

## Estrutura do Projeto

```
assistente-rag/
├── components/       # Componentes React reutilizáveis
├── lib/              # Bibliotecas e utilitários
├── pages/            # Páginas da aplicação
│   ├── api/          # APIs para o frontend
│   └── ...           # Páginas da interface
└── ...
```

## Como Integrar ao StayFocus

### 1. Configuração do Ambiente

Primeiro, configure as variáveis de ambiente necessárias. Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase

# OpenAI
OPENAI_API_KEY=sua_chave_api_openai

# PIX (API do seu banco/PSP)
PIX_API_BASE_URL=url_base_api_pix
PIX_API_CLIENT_ID=client_id_api_pix
PIX_API_CLIENT_SECRET=client_secret_api_pix
PIX_API_KEY=sua_chave_pix
```

### 2. Instalação de Dependências

Instale as dependências necessárias:

```bash
npm install
```

### 3. Configuração do Banco de Dados

Execute as migrações necessárias no Supabase para criar as tabelas:

- `usuarios`: Armazenamento de dados dos usuários
- `envelopes_financeiros`: Gerenciamento de orçamentos
- `hiperfocos`: Registro de interesses intensos
- `conversas_assistente`: Histórico de conversas com o assistente
- `preferencias`: Configurações e preferências do usuário

### 4. Integrando ao Frontend Existente

#### Importando Componentes

Você pode importar os componentes necessários no seu projeto:

```tsx
import AssistantChat from 'assistente-rag/components/AssistantChat';
import WhatsAppSetup from 'assistente-rag/components/WhatsAppSetup';
import PixPayment from 'assistente-rag/components/PixPayment';
```

#### Adicionando à Navegação

Adicione uma entrada na navegação do StayFocus para acessar o assistente:

```tsx
<Link href="/assistente">
  <a>Assistente</a>
</Link>
```

#### Exemplo de Integração em Página Existente

```tsx
import React from 'react';
import AssistantChat from 'assistente-rag/components/AssistantChat';

const SuaPaginaExistente = ({ usuario }) => {
  return (
    <div>
      <h1>Sua Página</h1>
      
      {/* Outros componentes da página */}
      
      <div className="mt-8">
        <h2>Seu Assistente Personalizado</h2>
        <AssistantChat userId={usuario.id} />
      </div>
    </div>
  );
};

export default SuaPaginaExistente;
```

### 5. Integrando WhatsApp

Para iniciar o servidor WhatsApp:

```bash
npm run whatsapp-server
```

Na primeira execução, um QR code será exibido no console. Escaneie com o WhatsApp do administrador para conectar.

### 6. Configurando Webhook PIX

Configure o endpoint do webhook PIX na plataforma do seu PSP (Provedor de Serviços de Pagamento) para apontar para:

```
https://seu-dominio.com/api/pix-webhook
```

## Exemplos de Uso

### Configurando o Assistente em uma Página de Hiperfoco

```tsx
import React from 'react';
import AssistantChat from 'assistente-rag/components/AssistantChat';

const PaginaHiperfoco = ({ usuario, hiperfoco }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-2">
        {/* Conteúdo principal da página de hiperfoco */}
        <h1>{hiperfoco.titulo}</h1>
        {/* ... */}
      </div>
      
      <div className="md:col-span-1">
        <h2>Assistente</h2>
        <AssistantChat 
          userId={usuario.id} 
          initialMessages={[
            {
              id: 'initial',
              isUser: false,
              text: `Notei que você está trabalhando no hiperfoco "${hiperfoco.titulo}". Posso ajudar com alguma tarefa ou regulação cognitiva?`,
              timestamp: new Date().toISOString()
            }
          ]}
        />
      </div>
    </div>
  );
};

export default PaginaHiperfoco;
```

## Considerações

- O armazenamento de conversas do assistente é importante para personalização contínua
- A integração com WhatsApp requer um número de telefone dedicado
- Para produção, considere modelos de IA mais leves para otimização de custos

## Suporte

Para dúvidas ou suporte, entre em contato com a equipe de desenvolvimento.

---

Este projeto foi desenvolvido para o StayFocus, uma aplicação dedicada a apoiar pessoas neurodivergentes com foco especial em TDAH. 