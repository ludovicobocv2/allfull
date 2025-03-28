'use client'

import React, { useState } from 'react';
import AssistantChat from './components/AssistantChat';
import WhatsAppSetup from './components/WhatsAppSetup';
import PixPayment from './components/PixPayment';

// Simulação: Na implementação real, isso viria do Supabase
const mockUser = {
  id: 'user_12345',
  name: 'Usuário Teste',
  hasWhatsAppSetup: false,
  subscription: 'free' as ('free' | 'premium' | 'premium_plus')
};

export default function AssistentePage() {
  const [activeTab, setActiveTab] = useState<'chat' | 'whatsapp' | 'subscription'>('chat');
  const [showPixPayment, setShowPixPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'premium' | 'premium_plus' | null>(null);
  const [hasWhatsAppSetup, setHasWhatsAppSetup] = useState(mockUser.hasWhatsAppSetup);
  const [userSubscription, setUserSubscription] = useState(mockUser.subscription);
  
  // Função para enviar mensagem para WhatsApp
  const handleSendToWhatsApp = async (message: string) => {
    if (!hasWhatsAppSetup) {
      alert('Você precisa configurar seu WhatsApp antes de usar esta função');
      setActiveTab('whatsapp');
      return;
    }
    
    try {
      // Simulação de envio para WhatsApp
      alert(`Mensagem enviada para seu WhatsApp: ${message.substring(0, 30)}...`);
    } catch (error) {
      console.error('Erro ao enviar para WhatsApp:', error);
      alert('Erro ao enviar mensagem para WhatsApp');
    }
  };
  
  // Função para lidar com conclusão de configuração do WhatsApp
  const handleWhatsAppSetupComplete = () => {
    setHasWhatsAppSetup(true);
  };
  
  // Função para selecionar plano de assinatura
  const handleSelectPlan = (plan: 'premium' | 'premium_plus') => {
    setSelectedPlan(plan);
    setShowPixPayment(true);
  };
  
  // Função para lidar com sucesso no pagamento
  const handlePaymentSuccess = () => {
    setShowPixPayment(false);
    if (selectedPlan) {
      setUserSubscription(selectedPlan);
    }
    setSelectedPlan(null);
  };
  
  // Função para cancelar pagamento
  const handleCancelPayment = () => {
    setShowPixPayment(false);
    setSelectedPlan(null);
  };
  
  // Preços dos planos
  const planPrices = {
    premium: 19.90,
    premium_plus: 49.90
  };
  
  // Descrições dos planos
  const planDescriptions = {
    premium: 'Plano Premium - Assistente Virtual RAG personalizado',
    premium_plus: 'Plano Premium+ - Assistente Virtual RAG + Integrações avançadas'
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-hiperfocos-primary">Assistente StayFocus</h1>
      
      {/* Abas de navegação */}
      <div className="flex justify-center mb-6">
        <div className="flex space-x-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
          <button
            className={`px-4 py-2 rounded-md ${
              activeTab === 'chat' 
                ? 'bg-hiperfocos-primary text-white' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            onClick={() => setActiveTab('chat')}
          >
            Chat
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              activeTab === 'whatsapp' 
                ? 'bg-hiperfocos-primary text-white' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            onClick={() => setActiveTab('whatsapp')}
          >
            WhatsApp
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              activeTab === 'subscription' 
                ? 'bg-hiperfocos-primary text-white' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            onClick={() => setActiveTab('subscription')}
          >
            Assinatura
          </button>
        </div>
      </div>
      
      {/* Conteúdo da aba atual */}
      <div className="max-w-4xl mx-auto">
        {activeTab === 'chat' && (
          <div className="h-[600px]">
            <AssistantChat 
              userId={mockUser.id} 
              onSendToWhatsApp={hasWhatsAppSetup ? handleSendToWhatsApp : undefined} 
            />
          </div>
        )}
        
        {activeTab === 'whatsapp' && (
          <WhatsAppSetup 
            userId={mockUser.id} 
            onSetupComplete={handleWhatsAppSetupComplete} 
          />
        )}
        
        {activeTab === 'subscription' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Planos de Assinatura</h2>
            
            <div className="text-gray-600 dark:text-gray-300 mb-6">
              <p>
                Seu plano atual: 
                <span className="ml-2 font-semibold">
                  {userSubscription === 'free' ? 'Gratuito' : 
                   userSubscription === 'premium' ? 'Premium' : 'Premium+'}
                </span>
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Plano Premium */}
              <div className="border dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Premium</h3>
                <div className="text-3xl font-bold my-4 text-financas-primary">
                  R$ {planPrices.premium.toFixed(2)}<span className="text-sm font-normal">/mês</span>
                </div>
                
                <ul className="space-y-2 mb-6 text-gray-600 dark:text-gray-300">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Assistente RAG personalizado
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Integração com WhatsApp
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Divisão de tarefas para redução cognitiva
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Gerenciamento de hiperfocos
                  </li>
                </ul>
                
                <button
                  className={`w-full py-2 rounded-lg ${
                    userSubscription === 'premium' || userSubscription === 'premium_plus'
                      ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                      : 'bg-financas-primary text-white hover:bg-financas-secondary'
                  }`}
                  onClick={() => handleSelectPlan('premium')}
                  disabled={userSubscription === 'premium' || userSubscription === 'premium_plus'}
                >
                  {userSubscription === 'premium' || userSubscription === 'premium_plus'
                    ? 'Plano Atual ou Superior'
                    : 'Assinar Plano'}
                </button>
              </div>
              
              {/* Plano Premium+ */}
              <div className="border dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-hiperfocos-primary text-white px-3 py-1 text-xs">
                  Recomendado
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Premium+</h3>
                <div className="text-3xl font-bold my-4 text-financas-primary">
                  R$ {planPrices.premium_plus.toFixed(2)}<span className="text-sm font-normal">/mês</span>
                </div>
                
                <ul className="space-y-2 mb-6 text-gray-600 dark:text-gray-300">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Tudo do plano Premium
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Notificações proativas
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Análises aprofundadas de comportamento
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Suporte priorizado
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Personalização avançada
                  </li>
                </ul>
                
                <button
                  className={`w-full py-2 rounded-lg ${
                    userSubscription === 'premium_plus'
                      ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                      : 'bg-financas-primary text-white hover:bg-financas-secondary'
                  }`}
                  onClick={() => handleSelectPlan('premium_plus')}
                  disabled={userSubscription === 'premium_plus'}
                >
                  {userSubscription === 'premium_plus'
                    ? 'Plano Atual'
                    : 'Assinar Plano'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Componente de pagamento PIX */}
        {showPixPayment && selectedPlan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="max-w-md w-full mx-4">
              <PixPayment
                userId={mockUser.id}
                amount={planPrices[selectedPlan]}
                description={planDescriptions[selectedPlan]}
                onSuccess={handlePaymentSuccess}
                onCancel={handleCancelPayment}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 