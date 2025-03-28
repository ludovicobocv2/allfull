import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Cliente do Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Função para obter dados do usuário
export async function getUserData(userId: string) {
  try {
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
  } catch (error) {
    console.error('Exceção ao buscar dados do usuário:', error);
    return null;
  }
}

// Função para obter preferências e configurações do usuário
export async function getUserPreferences(userId: string) {
  try {
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
  } catch (error) {
    console.error('Exceção ao buscar preferências do usuário:', error);
    return null;
  }
}

// Função para verificar se o usuário possui WhatsApp configurado
export async function checkWhatsAppSetup(userId: string): Promise<boolean> {
  try {
    const userData = await getUserData(userId);
    
    if (!userData) return false;
    
    return Boolean(userData.whatsapp_number) && userData.whatsapp_number.length > 0;
  } catch (error) {
    console.error('Erro ao verificar configuração de WhatsApp:', error);
    return false;
  }
}

// Função para obter o número de WhatsApp do usuário
export async function getUserWhatsAppNumber(userId: string): Promise<string | null> {
  try {
    const userData = await getUserData(userId);
    
    if (!userData || !userData.whatsapp_number) return null;
    
    return userData.whatsapp_number;
  } catch (error) {
    console.error('Erro ao buscar número de WhatsApp do usuário:', error);
    return null;
  }
}

// Função para obter o plano de assinatura do usuário
export async function getUserSubscription(userId: string): Promise<'free' | 'premium' | 'premium_plus'> {
  try {
    const { data, error } = await supabase
      .from('assinaturas')
      .select('tipo, status')
      .eq('usuario_id', userId)
      .eq('status', 'active')
      .single();
    
    if (error || !data) {
      return 'free';
    }
    
    return data.tipo as 'free' | 'premium' | 'premium_plus';
  } catch (error) {
    console.error('Erro ao buscar assinatura do usuário:', error);
    return 'free';
  }
}

// Função para registrar uma nova assinatura
export async function registerSubscription(
  userId: string, 
  plan: 'premium' | 'premium_plus',
  txid: string,
  amount: number
) {
  try {
    const { data, error } = await supabase
      .from('assinaturas')
      .insert([
        {
          usuario_id: userId,
          tipo: plan,
          valor: amount,
          status: 'active',
          data_inicio: new Date().toISOString(),
          referencia_pagamento: txid,
        }
      ]);
    
    if (error) {
      console.error('Erro ao registrar assinatura:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Exceção ao registrar assinatura:', error);
    return null;
  }
} 