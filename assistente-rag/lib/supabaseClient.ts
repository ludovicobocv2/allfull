import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Cria cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Função para obter dados do usuário
export async function getUserData(userId: string) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Erro ao buscar dados do usuário:', error);
    return null;
  }
  
  return data;
}

// Função para obter dados financeiros do usuário
export async function getFinancialData(userId: string) {
  const { data, error } = await supabase
    .from('envelopes_financeiros')
    .select('*')
    .eq('usuario_id', userId);
  
  if (error) {
    console.error('Erro ao buscar dados financeiros:', error);
    return null;
  }
  
  return data;
}

// Função para obter preferências e configurações do usuário
export async function getUserPreferences(userId: string) {
  const { data, error } = await supabase
    .from('preferencias')
    .select('*')
    .eq('usuario_id', userId)
    .single();
  
  if (error) {
    console.error('Erro ao buscar preferências do usuário:', error);
    return null;
  }
  
  return data;
}

// Função para registrar conversas do assistente
export async function saveAssistantConversation(conversationData: {
  userId: string;
  message: string;
  response: string;
  contextData?: any;
  timestamp?: string;
}) {
  const { data, error } = await supabase
    .from('conversas_assistente')
    .insert([
      {
        usuario_id: conversationData.userId,
        mensagem: conversationData.message,
        resposta: conversationData.response,
        dados_contexto: conversationData.contextData || {},
        timestamp: conversationData.timestamp || new Date().toISOString()
      }
    ]);
  
  if (error) {
    console.error('Erro ao salvar conversa:', error);
    return null;
  }
  
  return data;
}

// Função para registrar hiperfoco novo
export async function saveHyperfocus(hyperfocusData: {
  userId: string;
  title: string;
  description?: string;
  budget?: number;
  startDate?: string;
}) {
  const { data, error } = await supabase
    .from('hiperfocos')
    .insert([
      {
        usuario_id: hyperfocusData.userId,
        titulo: hyperfocusData.title,
        descricao: hyperfocusData.description || '',
        orcamento: hyperfocusData.budget || 0,
        data_inicio: hyperfocusData.startDate || new Date().toISOString()
      }
    ]);
  
  if (error) {
    console.error('Erro ao salvar hiperfoco:', error);
    return null;
  }
  
  return data;
}

// Função para buscar histórico de hiperfocos
export async function getHyperfocusHistory(userId: string) {
  const { data, error } = await supabase
    .from('hiperfocos')
    .select('*')
    .eq('usuario_id', userId)
    .order('data_inicio', { ascending: false });
  
  if (error) {
    console.error('Erro ao buscar histórico de hiperfocos:', error);
    return null;
  }
  
  return data;
} 