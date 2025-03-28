```mermaid
erDiagram
    %% Entidades principais
    USERS {
        uuid id PK
        string email
        string nome
        timestamp created_at
        timestamp updated_at
        boolean is_confirmed
        string auth_method
        jsonb metadata
    }
    
    USER_PREFERENCES {
        uuid id PK
        uuid user_id FK
        jsonb interface_preferences
        jsonb notification_settings
        jsonb accessibility_settings
        timestamp updated_at
    }
    
    HYPERFOCUS_SESSIONS {
        uuid id PK
        uuid user_id FK
        timestamp start_time
        timestamp end_time
        int duration_minutes
        string task_type
        string task_description
        int productivity_score
        jsonb metadata
    }
    
    SUBSCRIPTIONS {
        uuid id PK
        uuid user_id FK
        string plan_type
        timestamp start_date
        timestamp end_date
        boolean is_active
        string payment_method
        timestamp last_payment_date
        decimal amount
        string currency
        string status
    }
    
    PAYMENTS {
        uuid id PK
        uuid subscription_id FK
        string payment_id
        timestamp payment_date
        decimal amount
        string currency
        string status
        string pix_code
        timestamp expiration_time
        jsonb transaction_data
    }
    
    %% Entidades relacionadas ao RAG
    ASSISTANT_CONVERSATIONS {
        uuid id PK
        uuid user_id FK
        timestamp created_at
        timestamp ended_at
        string source
        string status
        int message_count
        int total_tokens
        decimal estimated_cost
        jsonb metadata
    }
    
    ASSISTANT_MESSAGES {
        uuid id PK
        uuid conversation_id FK
        string role
        text content
        timestamp timestamp
        int tokens
        jsonb metadata
    }
    
    CONTEXTUAL_DATA {
        uuid id PK
        uuid user_id FK
        string data_type
        text content
        vector embedding
        timestamp created_at
        float relevance_score
        string source
        jsonb metadata
    }
    
    %% Entidades para WhatsApp
    WHATSAPP_SESSIONS {
        uuid id PK
        uuid user_id FK
        string phone_number
        timestamp last_interaction
        string session_status
        jsonb session_data
    }
    
    %% Entidades para Monitoramento
    SYSTEM_METRICS {
        uuid id PK
        timestamp timestamp
        string metric_type
        float value
        string dimension
        jsonb additional_data
    }
    
    AUDIT_LOGS {
        uuid id PK
        uuid user_id FK
        timestamp timestamp
        string action
        string resource_type
        string resource_id
        jsonb request_data
        string ip_address
        string user_agent
    }
    
    %% Relacionamentos
    USERS ||--o{ USER_PREFERENCES : "tem"
    USERS ||--o{ HYPERFOCUS_SESSIONS : "realiza"
    USERS ||--o{ SUBSCRIPTIONS : "possui"
    USERS ||--o{ ASSISTANT_CONVERSATIONS : "participa"
    USERS ||--o{ CONTEXTUAL_DATA : "gera"
    USERS ||--o{ WHATSAPP_SESSIONS : "conecta"
    USERS ||--o{ AUDIT_LOGS : "gera"
    
    SUBSCRIPTIONS ||--o{ PAYMENTS : "possui"
    
    ASSISTANT_CONVERSATIONS ||--o{ ASSISTANT_MESSAGES : "contém"
```

# Diagrama de Estrutura do Banco de Dados: StayFocus com Integração RAG

O diagrama acima ilustra a estrutura completa do banco de dados Supabase para o sistema StayFocus, incluindo todas as tabelas necessárias para suportar o assistente RAG, integração com WhatsApp e sistema de pagamentos PIX. Este diagrama pode ser visualizado em qualquer renderizador Mermaid, como o GitHub ou editores Markdown que suportam Mermaid.

## Principais Tabelas e Relacionamentos

### Tabelas de Usuários
- **USERS**: Armazena os dados principais dos usuários, incluindo informações de autenticação e metadados
- **USER_PREFERENCES**: Contém as preferências individuais dos usuários, incluindo configurações de interface, notificações e acessibilidade

### Tabelas de Funcionalidades Principais
- **HYPERFOCUS_SESSIONS**: Registra as sessões de foco intenso dos usuários, incluindo duração, tipo de tarefa e métricas de produtividade
- **SUBSCRIPTIONS**: Armazena informações sobre as assinaturas dos usuários
- **PAYMENTS**: Registra transações de pagamento relacionadas às assinaturas, incluindo dados específicos de PIX

### Tabelas do Assistente RAG
- **ASSISTANT_CONVERSATIONS**: Registra as conversas entre usuários e o assistente RAG
- **ASSISTANT_MESSAGES**: Armazena mensagens individuais dentro de uma conversa
- **CONTEXTUAL_DATA**: Contém dados contextuais para personalização das respostas do RAG, incluindo embeddings vetoriais para busca semântica

### Tabelas para WhatsApp
- **WHATSAPP_SESSIONS**: Gerencia sessões de conexão WhatsApp dos usuários

### Tabelas de Monitoramento
- **SYSTEM_METRICS**: Armazena métricas de desempenho do sistema
- **AUDIT_LOGS**: Registra ações importantes dos usuários para auditoria e segurança

## Campos Especiais

### Campos Vetoriais
- **CONTEXTUAL_DATA.embedding**: Campo vetorial para armazenar embeddings para busca semântica

### Campos JSONB
- Vários campos **jsonb** são usados para armazenar dados estruturados flexíveis, como metadados, preferências de interface e dados de transação

## Relacionamentos Principais

- Um usuário pode ter múltiplas sessões de hyperfocus
- Um usuário pode ter múltiplas conversas com o assistente
- Cada conversa contém múltiplas mensagens
- Um usuário pode ter múltiplos dados contextuais associados
- Um usuário pode ter uma assinatura ativa, que pode ter múltiplos pagamentos

## Considerações para Implementação

- **Índices**: Adicionar índices para campos frequentemente usados em consultas
- **RLS (Row-Level Security)**: Implementar políticas RLS do Supabase para garantir que usuários só acessem seus próprios dados
- **Índice Vetorial**: Configurar índice vetorial no campo `embedding` da tabela CONTEXTUAL_DATA para busca eficiente
- **Triggers**: Implementar triggers para manter integridade referencial e atualizar campos derivados

Este diagrama serve como referência para a criação das tabelas e relacionamentos no Supabase, seguindo as melhores práticas de modelagem de dados para sistemas com funcionalidades RAG. 