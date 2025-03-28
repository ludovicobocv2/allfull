```mermaid
graph TD
    %% Definição dos estilos
    classDef frontend fill:#d4f1f9,stroke:#05a,stroke-width:1px
    classDef backend fill:#ffe6cc,stroke:#d79b00,stroke-width:1px
    classDef external fill:#e1d5e7,stroke:#9673a6,stroke-width:1px
    classDef database fill:#d5e8d4,stroke:#82b366,stroke-width:1px
    classDef rag fill:#fff2cc,stroke:#d6b656,stroke-width:1px
    
    %% Nós do fluxograma
    User[Usuário] --> Frontend[Frontend StayFocus]:::frontend
    
    %% Autenticação
    Frontend -- Autenticação --> Auth[Autenticação Supabase]:::backend
    Auth --> DB_Users[(Tabela de Usuários)]:::database
    
    %% Fluxo principal
    Frontend --> RAG_Component[Componente Assistente RAG]:::frontend
    RAG_Component --> RAG_API[API Assistente RAG]:::backend
    RAG_API --> DB_Context[(Dados Contextuais)]:::database
    RAG_API --> RAG_Engine[Motor RAG]:::rag
    
    %% Integração com WhatsApp
    User -- Mensagem --> WhatsApp[WhatsApp]:::external
    WhatsApp --> WhatsApp_API[API WhatsApp]:::backend
    WhatsApp_API --> RAG_API
    RAG_API --> WhatsApp_API
    WhatsApp_API --> WhatsApp
    WhatsApp --> User
    
    %% Integração com Pagamentos
    Frontend -- Solicitação de pagamento --> Payment[Interface de Pagamento]:::frontend
    Payment --> PIX_API[API PIX]:::backend
    PIX_API --> External_PIX[Provedor PIX]:::external
    External_PIX -- Confirmação --> PIX_Webhook[Webhook PIX]:::backend
    PIX_Webhook --> DB_Subscriptions[(Assinaturas)]:::database
    
    %% Hyperfocus
    Frontend --> Hyperfocus[Módulo Hyperfocus]:::frontend
    Hyperfocus --> DB_Sessions[(Sessões Hyperfocus)]:::database
    DB_Sessions -- Dados para contexto --> DB_Context
    
    %% Processamento RAG
    RAG_Engine -- Busca dados --> DB_Context
    RAG_Engine -- Geração de resposta --> RAG_API
    DB_Users -- Perfil do usuário --> RAG_Engine
    
    %% Monitoramento
    RAG_API --> Monitoring[Sistema de Monitoramento]:::backend
    Monitoring --> DB_Metrics[(Métricas e Logs)]:::database
    
    %% Legenda
    subgraph Legenda
        FE[Frontend]:::frontend
        BE[Backend]:::backend
        EX[Sistemas Externos]:::external
        DB[(Banco de Dados)]:::database
        RAG_E[Componentes RAG]:::rag
    end
```

# Diagrama de Fluxo: Integração RAG com StayFocus, WhatsApp e PIX

O diagrama acima ilustra o fluxo completo de integração do assistente RAG com o sistema StayFocus, incluindo WhatsApp e o sistema de pagamentos PIX. Este diagrama pode ser visualizado em qualquer renderizador Mermaid, como o GitHub ou editores Markdown que suportam Mermaid.

## Componentes Principais

### Frontend
- **Frontend StayFocus**: Interface principal da aplicação
- **Componente Assistente RAG**: Interface do usuário para interação com o assistente
- **Interface de Pagamento**: Componente para processar pagamentos
- **Módulo Hyperfocus**: Gerencia sessões de foco intenso dos usuários

### Backend
- **Autenticação Supabase**: Gerencia identidades e sessões de usuários
- **API Assistente RAG**: Processa solicitações ao assistente
- **API WhatsApp**: Gerencia comunicação com WhatsApp
- **API PIX**: Processa solicitações de pagamento
- **Webhook PIX**: Recebe confirmações de pagamento
- **Sistema de Monitoramento**: Monitora desempenho e erros

### Banco de Dados (Supabase)
- **Tabela de Usuários**: Armazena perfis e preferências
- **Dados Contextuais**: Armazena informações para contextualização do RAG
- **Assinaturas**: Registra pagamentos e status de assinatura
- **Sessões Hyperfocus**: Armazena dados de sessões de concentração
- **Métricas e Logs**: Armazena dados de monitoramento

### Sistemas Externos
- **WhatsApp**: Plataforma de mensagens
- **Provedor PIX**: Serviço de pagamentos

### Componentes RAG
- **Motor RAG**: Núcleo da funcionalidade de geração aumentada por recuperação

## Como Interpretar o Fluxo

1. O usuário interage com o sistema via frontend ou WhatsApp
2. Autenticação é gerenciada pelo Supabase
3. As solicitações ao assistente são processadas pelo motor RAG
4. O motor RAG busca dados contextuais para personalizar respostas
5. Pagamentos são processados via API PIX com confirmações via webhook
6. O sistema de monitoramento rastreia métricas e logs
7. Dados de sessões Hyperfocus alimentam o contexto do assistente RAG

## Notas sobre Implementação

- As cores no diagrama representam diferentes tipos de componentes
- As setas indicam a direção do fluxo de dados
- Os componentes estão agrupados por funcionalidade
- O banco de dados centraliza todas as informações necessárias para o funcionamento integrado

Este diagrama serve como referência visual para entender como todos os componentes do sistema se interconectam e como os dados fluem entre eles. 