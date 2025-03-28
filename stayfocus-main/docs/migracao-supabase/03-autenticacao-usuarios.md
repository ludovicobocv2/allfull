# Fase 3: Autenticação e Usuários

## Objetivo

Implementar o sistema de autenticação do Supabase e criar a estrutura de gerenciamento de usuários, garantindo uma integração adequada com o sistema existente e preparando a base para as funcionalidades do assistente RAG.

## Raciocínio

A autenticação é um componente central para qualquer aplicação, especialmente para um sistema como o StayFocus que lida com dados pessoais e conteúdo personalizado. O Supabase oferece um sistema robusto de autenticação que inclui várias opções de login, gerenciamento de sessões e proteção de dados.

Para o assistente RAG, uma autenticação confiável é essencial, pois permite recuperar os dados contextuais específicos do usuário correto, garantindo respostas personalizadas e relevantes.

## Etapas Detalhadas

### 3.1 Configurar provedores de autenticação no Supabase

1. Acessar o painel de administração do Supabase → Autenticação → Provedores

2. Configurar e-mail/senha:
   - Ativar login com e-mail e senha
   - Configurar os e-mails de verificação, redefinição de senha
   - Definir o URL de redirecionamento para o site principal

3. (Opcional) Configurar outros provedores:
   - Google
   - GitHub
   - Facebook

### 3.2 Implementar componentes de autenticação no front-end

**Criar arquivo `app/auth/components/AuthForm.tsx`:**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/database';

type AuthMode = 'login' | 'register' | 'resetPassword';

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [mode, setMode] = useState<AuthMode>('login');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();

  const resetForm = () => {
    setError(null);
    setMessage(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetForm();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      router.push('/dashboard');
      router.refresh();
    } catch (error: any) {
      setError(error.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetForm();
    setLoading(true);

    if (!nome) {
      setError('Nome completo é obrigatório');
      setLoading(false);
      return;
    }

    try {
      // 1. Registrar o usuário na autenticação
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Criar o perfil do usuário na tabela usuarios
        const { error: profileError } = await supabase
          .from('usuarios')
          .insert({
            auth_id: authData.user.id,
            email: email,
            nome_completo: nome,
          });

        if (profileError) throw profileError;

        setMessage('Registro realizado com sucesso! Verifique seu e-mail para confirmar a conta.');
        setMode('login');
      }
    } catch (error: any) {
      setError(error.message || 'Erro ao registrar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetForm();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      if (error) throw error;
      setMessage('Instruções de redefinição de senha enviadas para o seu e-mail');
    } catch (error: any) {
      setError(error.message || 'Erro ao enviar e-mail de redefinição');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">
        {mode === 'login' ? 'Login' : mode === 'register' ? 'Cadastro' : 'Recuperar Senha'}
      </h1>

      {error && <div className="w-full p-3 mb-4 text-red-700 bg-red-100 rounded">{error}</div>}
      {message && <div className="w-full p-3 mb-4 text-green-700 bg-green-100 rounded">{message}</div>}

      <form 
        className="w-full" 
        onSubmit={
          mode === 'login' 
            ? handleLogin 
            : mode === 'register' 
              ? handleRegister 
              : handleResetPassword
        }
      >
        {mode === 'register' && (
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="nome">
              Nome Completo
            </label>
            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full p-2 border rounded"
              required={mode === 'register'}
            />
          </div>
        )}

        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        {mode !== 'resetPassword' && (
          <div className="mb-6">
            <label className="block text-gray-700 mb-2" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded"
              required={mode !== 'resetPassword'}
            />
          </div>
        )}

        <button
          type="submit"
          className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 mb-4"
          disabled={loading}
        >
          {loading
            ? 'Carregando...'
            : mode === 'login'
            ? 'Entrar'
            : mode === 'register'
            ? 'Cadastrar'
            : 'Enviar Instruções'}
        </button>
      </form>

      <div className="mt-4 text-center">
        {mode === 'login' ? (
          <>
            <button
              onClick={() => setMode('resetPassword')}
              className="text-blue-600 hover:underline mb-2 block"
            >
              Esqueceu a senha?
            </button>
            <p>
              Não tem uma conta?{' '}
              <button
                onClick={() => setMode('register')}
                className="text-blue-600 hover:underline"
              >
                Cadastre-se
              </button>
            </p>
          </>
        ) : mode === 'register' ? (
          <p>
            Já tem uma conta?{' '}
            <button
              onClick={() => setMode('login')}
              className="text-blue-600 hover:underline"
            >
              Faça login
            </button>
          </p>
        ) : (
          <p>
            <button
              onClick={() => setMode('login')}
              className="text-blue-600 hover:underline"
            >
              Voltar para o login
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
```

### 3.3 Criar páginas de autenticação

**Criar arquivo `app/auth/login/page.tsx`:**

```tsx
import { Metadata } from 'next';
import AuthForm from '../components/AuthForm';

export const metadata: Metadata = {
  title: 'Login | StayFocus',
  description: 'Faça login na sua conta StayFocus',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <AuthForm />
      </div>
    </div>
  );
}
```

**Criar arquivo `app/auth/update-password/page.tsx`:**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('As senhas não correspondem');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });
      
      if (error) throw error;
      
      setMessage('Senha atualizada com sucesso!');
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (error: any) {
      setError(error.message || 'Erro ao atualizar senha');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6">Atualizar Senha</h1>
        
        {error && <div className="p-3 mb-4 text-red-700 bg-red-100 rounded">{error}</div>}
        {message && <div className="p-3 mb-4 text-green-700 bg-green-100 rounded">{message}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="password">
              Nova Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 mb-2" htmlFor="confirmPassword">
              Confirmar Senha
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Atualizando...' : 'Atualizar Senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### 3.4 Implementar middleware para autenticação

**Criar/atualizar arquivo `middleware.ts` na raiz do projeto:**

```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Verificar se a sessão está ativa
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Rotas protegidas (requer autenticação)
  const protectedRoutes = [
    '/dashboard',
    '/financas',
    '/estudos',
    '/hiperfocos',
    '/alimentacao',
    '/assistente'
  ];

  // Rotas de autenticação
  const authRoutes = ['/auth/login', '/auth/signup'];

  // URL atual
  const path = req.nextUrl.pathname;

  // Verificar se a rota atual é protegida
  const isProtectedRoute = protectedRoutes.some(route => 
    path === route || path.startsWith(`${route}/`)
  );

  // Verificar se a rota atual é de autenticação
  const isAuthRoute = authRoutes.some(route => path === route);

  // Redirecionar se necessário
  if (isProtectedRoute && !session) {
    // Usuário não autenticado tentando acessar rota protegida
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  if (isAuthRoute && session) {
    // Usuário já autenticado tentando acessar página de login/cadastro
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return res;
}

// Configurar em quais caminhos o middleware deve ser executado
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/financas/:path*',
    '/estudos/:path*',
    '/hiperfocos/:path*',
    '/alimentacao/:path*',
    '/assistente/:path*',
    '/auth/:path*'
  ],
};
```

### 3.5 Criar componente de perfil de usuário

**Criar arquivo `app/components/UserProfile.tsx`:**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import type { Usuario } from '@/types/database';

export default function UserProfile() {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nome_completo: '',
    whatsapp_number: '',
  });
  
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    async function loadUserProfile() {
      try {
        // Obter os dados da sessão
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        if (!session) {
          router.push('/auth/login');
          return;
        }

        // Obter perfil completo do usuário
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('auth_id', session.user.id)
          .single();
        
        if (error) throw error;
        
        setUser(data);
        setFormData({
          nome_completo: data.nome_completo,
          whatsapp_number: data.whatsapp_number || '',
        });
      } catch (error: any) {
        console.error('Erro ao carregar perfil:', error.message);
        setError('Não foi possível carregar o perfil do usuário');
      } finally {
        setLoading(false);
      }
    }

    loadUserProfile();
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) return;

      const { error } = await supabase
        .from('usuarios')
        .update({
          nome_completo: formData.nome_completo,
          whatsapp_number: formData.whatsapp_number || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Atualizar o estado do usuário com os novos dados
      setUser({
        ...user,
        nome_completo: formData.nome_completo,
        whatsapp_number: formData.whatsapp_number || null,
      });
      
      setIsEditing(false);
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error.message);
      setError('Não foi possível atualizar o perfil');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-4">Carregando perfil...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  if (!user) {
    return <div className="text-center p-4">Usuário não encontrado</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Meu Perfil</h2>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Sair
        </button>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="nome_completo">
              Nome Completo
            </label>
            <input
              id="nome_completo"
              name="nome_completo"
              type="text"
              value={formData.nome_completo}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="whatsapp_number">
              Número de WhatsApp
            </label>
            <input
              id="whatsapp_number"
              name="whatsapp_number"
              type="text"
              value={formData.whatsapp_number}
              onChange={handleInputChange}
              placeholder="+55 (99) 99999-9999"
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div>
          <div className="mb-4">
            <p className="text-gray-600">E-mail</p>
            <p className="font-medium">{user.email}</p>
          </div>

          <div className="mb-4">
            <p className="text-gray-600">Nome Completo</p>
            <p className="font-medium">{user.nome_completo}</p>
          </div>

          <div className="mb-4">
            <p className="text-gray-600">Número de WhatsApp</p>
            <p className="font-medium">{user.whatsapp_number || 'Não configurado'}</p>
          </div>

          <div className="mb-4">
            <p className="text-gray-600">Plano</p>
            <p className="font-medium capitalize">{user.tipo_plano}</p>
          </div>

          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Editar Perfil
          </button>
        </div>
      )}
    </div>
  );
}
```

### 3.6 Criar hooks personalizados para autenticação

**Criar arquivo `app/hooks/useAuth.ts`:**

```typescript
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import type { Usuario } from '@/types/database';

export function useAuth() {
  const [user, setUser] = useState<Usuario | null>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Obter dados da sessão atual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (session) {
          setAuthUser(session.user);
          
          // Buscar dados completos do usuário
          const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('auth_id', session.user.id)
            .single();
          
          if (error) throw error;
          setUser(data);
        }
      } catch (error: any) {
        console.error('Erro ao carregar usuário:', error.message);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    // Executar a busca do usuário
    fetchUser();

    // Configurar listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setAuthUser(session.user);
          
          // Buscar dados completos do usuário
          const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('auth_id', session.user.id)
            .single();
          
          if (!error) {
            setUser(data);
          }
        } else {
          setUser(null);
          setAuthUser(null);
        }
        
        setLoading(false);
      }
    );

    // Cleanup ao desmontar
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  return {
    user,
    authUser,
    loading,
    error,
    signOut,
    isAuthenticated: !!authUser,
  };
}
```

### 3.7 Criar funções de utilidade para gerenciamento de usuários

**Criar arquivo `app/lib/user-utils.ts`:**

```typescript
import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Usuario, Preferencias } from '@/types/database';
import { Database } from '@/types/database';

// Função para obter o usuário atual (componente do servidor)
export async function getCurrentUser() {
  const supabase = createServerComponentClient<Database>({ cookies });
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return null;
    }
    
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('auth_id', session.user.id)
      .single();
    
    if (error) {
      console.error('Erro ao buscar usuário:', error.message);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao obter usuário atual:', error);
    return null;
  }
}

// Função para obter preferências do usuário
export async function getUserPreferences(userId: string) {
  const supabase = createClientComponentClient<Database>();
  
  try {
    const { data, error } = await supabase
      .from('preferencias')
      .select('*')
      .eq('usuario_id', userId)
      .single();
    
    if (error) {
      // Se não encontrou preferências, podemos criar um registro padrão
      if (error.code === 'PGRST116') {
        const { data: newPrefs, error: insertError } = await supabase
          .from('preferencias')
          .insert({
            usuario_id: userId,
            tema: 'system',
            notificacoes_email: true,
            notificacoes_whatsapp: false,
            frequencia_notificacoes: 'diaria',
            configuracoes_rag: {},
          })
          .select()
          .single();
        
        if (insertError) throw insertError;
        return newPrefs;
      }
      
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao obter preferências:', error);
    return null;
  }
}

// Função para atualizar perfil do usuário
export async function updateUserProfile(
  userId: string, 
  updates: Partial<Omit<Usuario, 'id' | 'auth_id' | 'email' | 'created_at' | 'updated_at'>>
) {
  const supabase = createClientComponentClient<Database>();
  
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    throw error;
  }
}

// Função para atualizar preferências do usuário
export async function updateUserPreferences(
  preferenceId: string,
  updates: Partial<Omit<Preferencias, 'id' | 'usuario_id' | 'created_at' | 'updated_at'>>
) {
  const supabase = createClientComponentClient<Database>();
  
  try {
    const { data, error } = await supabase
      .from('preferencias')
      .update(updates)
      .eq('id', preferenceId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao atualizar preferências:', error);
    throw error;
  }
}
```

## Verificação da Fase

A fase 3 está concluída quando:

- [x] A configuração de autenticação está concluída no painel Supabase
- [x] O componente de formulário de autenticação está implementado
- [x] As páginas de login, registro e recuperação de senha estão funcionando
- [x] O middleware para proteção de rotas está configurado
- [x] O componente de perfil do usuário está implementado
- [x] Os hooks e funções de utilidade para gerenciamento de usuários estão implementados
- [x] Os testes de autenticação foram realizados (login, registro, recuperação de senha)

## Próximos Passos

Após configurar o sistema de autenticação e gerenciamento de usuários, prosseguir para a [Fase 4: Integração de Dados](./04-integracao-dados.md), onde implementaremos a migração e sincronização de dados existentes com o Supabase. 