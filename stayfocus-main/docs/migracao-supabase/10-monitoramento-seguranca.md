# Fase 10: Monitoramento e Segurança

## Objetivos
- Implementar sistema de monitoramento para a aplicação
- Configurar medidas de segurança para proteção de dados sensíveis
- Desenvolver fluxos de auditoria e conformidade

## Componentes Principais

### 1. Dashboard de Monitoramento

```typescript
// pages/admin/dashboard.tsx
import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PieChart, Pie, Cell, Legend } from 'recharts';
import { LogComponent } from '@/lib/rag/debug';

// Cores para o gráfico
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

function AdminDashboard() {
  const supabase = useSupabaseClient();
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    ragInteractions: 0,
    avgResponseTime: 0,
    errorRate: 0,
    userGrowth: []
  });
  const [componentErrors, setComponentErrors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      
      try {
        // Total de usuários
        const { count: totalUsers } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });
          
        // Assinaturas ativas
        const { count: activeSubscriptions } = await supabase
          .from('subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);
          
        // Interações RAG
        const { count: ragInteractions } = await supabase
          .from('assistant_metrics')
          .select('*', { count: 'exact', head: true });
          
        // Tempo médio de resposta
        const { data: responseTimes } = await supabase
          .from('assistant_metrics')
          .select('response_time_ms')
          .order('created_at', { ascending: false })
          .limit(100);
          
        const avgResponseTime = responseTimes?.length 
          ? responseTimes.reduce((sum, item) => sum + item.response_time_ms, 0) / responseTimes.length 
          : 0;
          
        // Taxa de erros (últimas 24h)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const { count: totalLogs } = await supabase
          .from('system_logs')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', yesterday.toISOString());
          
        const { count: errorLogs } = await supabase
          .from('system_logs')
          .select('*', { count: 'exact', head: true })
          .eq('level', 'error')
          .gte('created_at', yesterday.toISOString());
          
        const errorRate = totalLogs ? (errorLogs / totalLogs) * 100 : 0;
        
        // Crescimento de usuários (últimos 7 dias)
        const { data: userGrowth } = await supabase.rpc('get_user_growth_last_days', { days_count: 7 });
        
        // Erros por componente
        const { data: errors } = await supabase
          .from('system_logs')
          .select('component, count')
          .eq('level', 'error')
          .gte('created_at', yesterday.toISOString())
          .group('component');
          
        const componentErrorsData = errors?.map(item => ({
          name: item.component,
          value: item.count
        })) || [];
        
        setMetrics({
          totalUsers: totalUsers || 0,
          activeSubscriptions: activeSubscriptions || 0,
          ragInteractions: ragInteractions || 0,
          avgResponseTime,
          errorRate,
          userGrowth: userGrowth || []
        });
        
        setComponentErrors(componentErrorsData);
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
    
    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard Administrativo</h1>
      
      {isLoading ? (
        <div className="flex justify-center py-10">
          <span className="text-gray-500">Carregando...</span>
        </div>
      ) : (
        <>
          {/* Cards de métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-gray-500 text-sm uppercase">Usuários</h2>
              <p className="text-3xl font-bold">{metrics.totalUsers}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-gray-500 text-sm uppercase">Assinaturas Ativas</h2>
              <p className="text-3xl font-bold">{metrics.activeSubscriptions}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-gray-500 text-sm uppercase">Interações RAG</h2>
              <p className="text-3xl font-bold">{metrics.ragInteractions}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-gray-500 text-sm uppercase">Tempo de Resposta</h2>
              <p className="text-3xl font-bold">{metrics.avgResponseTime.toFixed(0)} ms</p>
            </div>
          </div>
          
          {/* Gráfico de crescimento de usuários */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-lg font-semibold mb-4">Crescimento de Usuários (7 dias)</h2>
            <div className="h-64">
              {metrics.userGrowth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      name="Novos Usuários"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  Sem dados disponíveis
                </div>
              )}
            </div>
          </div>
          
          {/* Gráfico de erros por componente */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-lg font-semibold mb-4">Erros por Componente (24h)</h2>
            <div className="h-64">
              {componentErrors.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={componentErrors}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {componentErrors.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  Sem dados de erro disponíveis
                </div>
              )}
            </div>
          </div>
          
          {/* Taxa de erro */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-4">Taxa de Erro (24h)</h2>
            <div className="flex items-center">
              <div className={`text-2xl font-bold ${
                metrics.errorRate > 5 ? 'text-red-500' : 
                metrics.errorRate > 1 ? 'text-yellow-500' : 'text-green-500'
              }`}>
                {metrics.errorRate.toFixed(2)}%
              </div>
              <div className="ml-4 text-gray-500">
                {metrics.errorRate > 5 
                  ? 'Alta taxa de erros, investigação necessária' 
                  : metrics.errorRate > 1 
                  ? 'Taxa de erros moderada, monitorar' 
                  : 'Taxa de erros saudável'}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default withAdminAuth(AdminDashboard);
```

### 2. Função RPC para Estatísticas

```sql
-- Arquivo de migração: 0012_add_monitoring_functions.sql

-- Função para obter o crescimento de usuários nos últimos dias
CREATE OR REPLACE FUNCTION get_user_growth_last_days(days_count INTEGER)
RETURNS TABLE (date TEXT, count BIGINT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') as date,
    COUNT(*) as count
  FROM users
  WHERE created_at >= CURRENT_DATE - days_count
  GROUP BY DATE_TRUNC('day', created_at)
  ORDER BY DATE_TRUNC('day', created_at);
END;
$$;

-- Função para obter estatísticas do assistente RAG
CREATE OR REPLACE FUNCTION get_rag_stats(days_count INTEGER DEFAULT 30)
RETURNS TABLE (
  avg_response_time FLOAT,
  avg_context_items FLOAT,
  total_interactions BIGINT,
  avg_feedback_score FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    AVG(response_time_ms) as avg_response_time,
    AVG(context_items_count) as avg_context_items,
    COUNT(*) as total_interactions,
    AVG(feedback_score) as avg_feedback_score
  FROM assistant_metrics
  WHERE created_at >= CURRENT_DATE - days_count;
END;
$$;
```

### 3. Módulo de Auditoria de Acesso

```typescript
// lib/monitoring/audit.ts
import { supabase } from '@/lib/supabaseServer';

export enum AuditAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  PROFILE_UPDATE = 'profile_update',
  SUBSCRIPTION_CHANGE = 'subscription_change',
  ADMIN_ACTION = 'admin_action',
  PAYMENT = 'payment',
  DATA_EXPORT = 'data_export',
  API_ACCESS = 'api_access',
  SENSITIVE_DATA_ACCESS = 'sensitive_data_access'
}

interface AuditEvent {
  userId: string;
  action: AuditAction;
  description: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

export async function recordAuditEvent({
  userId,
  action,
  description,
  metadata = {},
  ipAddress,
  userAgent
}: AuditEvent) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      description,
      metadata,
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao registrar evento de auditoria:', error);
  }
}

export async function getUserAuditTrail(userId: string, limit = 100) {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar histórico de auditoria:', error);
    return [];
  }
}
```

### 4. Middleware de Segurança

```typescript
// middleware.ts (adicionar ao middleware existente)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  // Verificar a sessão
  const { data: { session } } = await supabase.auth.getSession();
  
  // Adicionar headers de segurança
  const secureHeaders = new Headers(res.headers);
  secureHeaders.set('X-Content-Type-Options', 'nosniff');
  secureHeaders.set('X-Frame-Options', 'DENY');
  secureHeaders.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://cdn.jsdelivr.net;");
  secureHeaders.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  secureHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  secureHeaders.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  const response = NextResponse.next({
    request: {
      headers: req.headers,
    },
    headers: secureHeaders,
  });
  
  // Para rotas protegidas, verificar acesso
  const url = req.nextUrl;
  
  if (url.pathname.startsWith('/admin') && (!session || !session?.user?.app_metadata?.is_admin)) {
    // Registrar tentativa de acesso não autorizado a área administrativa
    if (session?.user?.id) {
      // Código para registrar tentativa de acesso não autorizado
      // (implementação real omitiria logging direto no middleware e usaria um API endpoint)
    }
    
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }
  
  if ((url.pathname.startsWith('/api/admin') || url.pathname.startsWith('/api/sensitive')) &&
      (!session || !session?.user?.app_metadata?.is_admin)) {
    return new NextResponse(
      JSON.stringify({ error: 'Acesso não autorizado' }),
      { status: 403, headers: { 'content-type': 'application/json' } }
    );
  }
  
  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/sensitive/:path*',
    '/api/assistant/:path*'
    // Adicionar todas as rotas que precisam de segurança
  ],
};
```

### 5. Módulo de Backup de Contextos Sensíveis

```typescript
// lib/backup/contextual-data.ts
import { supabase } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Cliente de backup (poderia ser outro bucket Supabase ou outro armazenamento)
const backupClient = createClient(
  process.env.BACKUP_SUPABASE_URL!,
  process.env.BACKUP_SUPABASE_SERVICE_KEY!
);

interface BackupConfig {
  outputDir?: string;
  encrypt?: boolean;
  encryptionKey?: string;
}

export async function backupContextualData(config: BackupConfig = {}) {
  try {
    const { data, error } = await supabase
      .from('contextual_data')
      .select('*')
      .order('created_at', { ascending: true });
      
    if (error) {
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log('Nenhum dado contextual para backup');
      return;
    }
    
    // Organizar dados por usuário
    const dataByUser: Record<string, any[]> = {};
    
    data.forEach(item => {
      if (!dataByUser[item.user_id]) {
        dataByUser[item.user_id] = [];
      }
      dataByUser[item.user_id].push(item);
    });
    
    // Processar cada usuário
    for (const [userId, userData] of Object.entries(dataByUser)) {
      const backupData = JSON.stringify(userData);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `contextual_data_${userId}_${timestamp}.json`;
      
      if (config.outputDir) {
        // Backup local (geralmente apenas para desenvolvimento)
        const filePath = path.join(config.outputDir, filename);
        fs.writeFileSync(filePath, backupData);
      } else {
        // Backup no storage do Supabase
        await backupClient.storage
          .from('backups')
          .upload(`contextual-data/${filename}`, backupData, {
            contentType: 'application/json',
            cacheControl: '3600'
          });
      }
    }
    
    console.log(`Backup concluído para ${Object.keys(dataByUser).length} usuários`);
    return true;
  } catch (error) {
    console.error('Erro ao realizar backup de dados contextuais:', error);
    return false;
  }
}
```

## Configurações de Segurança do Supabase

```sql
-- Arquivo de migração: 0013_security_policies.sql

-- Row Level Security para dados contextuais
ALTER TABLE contextual_data ENABLE ROW LEVEL SECURITY;

-- Política para dados contextuais: usuários só podem ver seus próprios dados
CREATE POLICY "Usuários podem ver seus próprios dados contextuais"
  ON contextual_data
  FOR SELECT
  USING (auth.uid() = user_id);
  
-- Política para dados contextuais: administradores podem ver todos os dados
CREATE POLICY "Administradores podem ver todos os dados contextuais"
  ON contextual_data
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'is_admin'::text = 'true'
    )
  );

-- Políticas para histórico de conversas do assistente
ALTER TABLE assistant_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seu próprio histórico de conversas"
  ON assistant_conversations
  FOR SELECT
  USING (auth.uid() = user_id);
  
CREATE POLICY "Usuários podem inserir mensagens em seu histórico"
  ON assistant_conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Políticas para logs de sistema (apenas administradores)
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas admins podem ver logs de sistema"
  ON system_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'is_admin'::text = 'true'
    )
  );

-- Políticas para logs de auditoria
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios logs de auditoria"
  ON audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);
  
CREATE POLICY "Admins podem ver todos os logs de auditoria"
  ON audit_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'is_admin'::text = 'true'
    )
  );

-- Function para mascarar dados sensíveis na API
CREATE OR REPLACE FUNCTION mask_sensitive_data(record JSONB)
RETURNS JSONB AS $$
BEGIN
  IF record ? 'email' THEN
    record := jsonb_set(record, '{email}', to_jsonb(SUBSTRING(record->>'email', 1, 2) || '***' || SUBSTRING(record->>'email' FROM POSITION('@' IN record->>'email'))));
  END IF;
  
  IF record ? 'phone' THEN
    record := jsonb_set(record, '{phone}', to_jsonb(SUBSTRING(record->>'phone', 1, 3) || '*******' || SUBSTRING(record->>'phone' FROM LENGTH(record->>'phone') - 1)));
  END IF;
  
  RETURN record;
END;
$$ LANGUAGE plpgsql;
```

## Passos de Implementação

1. Configurar dashboard de monitoramento administrativo
2. Implementar sistema de auditoria de acessos
3. Configurar políticas de segurança no Supabase
4. Adicionar middlewares de segurança
5. Implementar sistema de backup de dados sensíveis
6. Configurar headers de segurança da aplicação

## Verificação

- [ ] Dashboard administrativo exibindo métricas corretas
- [ ] Sistema de auditoria registrando eventos críticos
- [ ] Políticas RLS protegendo dados sensíveis
- [ ] Middlewares prevenindo acessos não autorizados
- [ ] Backups automáticos configurados
- [ ] Headers de segurança implementados

## Próximos Passos

- Implementação de alertas automáticos para eventos críticos
- Sistema de detecção de anomalias
- Análise periódica de logs para identificação de padrões suspeitos 