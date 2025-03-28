# Fase 1: Configuração Inicial do Supabase

## Objetivo

Estabelecer a base técnica para a migração, configurando o projeto no Supabase e preparando o ambiente de desenvolvimento para utilizar seus recursos.

## Raciocínio

A configuração inicial precisa ser sólida para evitar problemas técnicos durante a implementação. Cada etapa nesta fase serve como fundação para todas as funcionalidades subsequentes. É essencial definir uma estrutura clara para acessar o Supabase em diferentes contextos (cliente vs. servidor) e garantir que as credenciais sejam gerenciadas com segurança.

## Etapas Detalhadas

### 1.1 Criar projeto no Supabase

```sh
# Não há comandos CLI para criar um projeto Supabase - isso é feito via interface web
```

**Passos manuais:**
1. Acessar [app.supabase.com](https://app.supabase.com)
2. Criar uma conta ou fazer login
3. Clicar em "New Project"
4. Preencher detalhes:
   - Nome: "StayFocus"
   - Database Password: (gerar senha forte e armazenar com segurança)
   - Região: Selecionar a mais próxima do Brasil (idealmente São Paulo ou região sul dos EUA)
   - Pricing Plan: Iniciar com Free (pode ser atualizado posteriormente)

**Considerações:**
- A escolha da região afeta significativamente a latência para usuários brasileiros
- A senha do banco de dados não é utilizável diretamente no frontend, mas deve ser armazenada com segurança para acesso administrativo

### 1.2 Configurar variáveis de ambiente

**Criar arquivo `.env.local` na raiz do projeto:**

```
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]
```

**Atualizar `.gitignore` para incluir:**

```
# Variáveis de ambiente locais
.env.local
.env.development.local
.env.test.local
.env.production.local
```

**Considerações:**
- As variáveis prefixadas com NEXT_PUBLIC_ serão expostas no cliente
- A chave de serviço (SERVICE_ROLE_KEY) deve ser usada apenas em contextos seguros do lado do servidor
- Nunca commitar arquivos .env com credenciais reais

### 1.3 Instalar e configurar dependências

```sh
# Instalar dependências do Supabase
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
# Tipos para TypeScript
npm install --save-dev @supabase/supabase-js@types
```

**Considerações:**
- O pacote auth-helpers-nextjs fornece utilitários específicos para Next.js, simplificando a integração
- É importante manter as versões compatíveis entre os pacotes

### 1.4 Configurar cliente Supabase para diferentes contextos

**Criar arquivo `lib/supabase/client.ts` para o lado do cliente:**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
```

**Criar arquivo `lib/supabase/admin.ts` para o lado do servidor:**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
```

**Criar hook personalizado em `lib/supabase/hooks.ts`:**

```typescript
import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabaseClient } from './client'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Obter estado atual do usuário
    const { data: { session } } = supabaseClient.auth.getSession()
    setUser(session?.user || null)
    setLoading(false)

    // Configurar listener para mudanças de autenticação
    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null)
        setLoading(false)
      }
    )

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}
```

## Verificação da Fase

A fase 1 está concluída quando:

- [x] Projeto Supabase está criado e acessível
- [x] Variáveis de ambiente estão configuradas
- [x] Dependências instaladas e atualizadas
- [x] Clientes Supabase configurados para cliente e servidor
- [x] Hook personalizado para acessar estado de autenticação está implementado

## Próximos Passos

Após a configuração inicial, prosseguir para a [Fase 2: Modelagem do Banco de Dados](./02-modelagem-banco-dados.md), onde definiremos o esquema completo para armazenar dados do StayFocus. 