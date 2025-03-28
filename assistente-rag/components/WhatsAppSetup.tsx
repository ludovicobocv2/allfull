import React, { useState } from 'react';
import axios from 'axios';

interface WhatsAppSetupProps {
  userId: string;
  onSetupComplete?: () => void;
  initialPhoneNumber?: string;
}

const WhatsAppSetup: React.FC<WhatsAppSetupProps> = ({
  userId,
  onSetupComplete,
  initialPhoneNumber = ''
}) => {
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Função para configurar WhatsApp
  const setupWhatsApp = async () => {
    if (!phoneNumber.trim()) {
      setError('Por favor, informe seu número de telefone');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await axios.post('/api/setup-whatsapp', {
        userId,
        phoneNumber
      });
      
      if (response.data.success) {
        setSuccess('Número de WhatsApp configurado com sucesso!');
        
        if (onSetupComplete) {
          onSetupComplete();
        }
      } else {
        setError(response.data.error || 'Erro ao configurar WhatsApp');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Erro ao conectar com o servidor');
      console.error('Erro ao configurar WhatsApp:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Função para formatar número de telefone durante digitação
  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remover caracteres não numéricos
    let value = e.target.value.replace(/\D/g, '');
    
    // Aplicar formatação (apenas para Brasil)
    if (value.length <= 2) {
      // Nada a formatar ainda
    } else if (value.length <= 7) {
      value = `(${value.substring(0, 2)}) ${value.substring(2)}`;
    } else if (value.length <= 11) {
      value = `(${value.substring(0, 2)}) ${value.substring(2, 7)}-${value.substring(7)}`;
    } else {
      value = `(${value.substring(0, 2)}) ${value.substring(2, 7)}-${value.substring(7, 11)}`;
    }
    
    setPhoneNumber(value);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Configurar WhatsApp</h2>
      
      <p className="text-gray-600 mb-4">
        Conecte seu número de WhatsApp para receber notificações e interagir com o assistente diretamente pelo aplicativo.
      </p>
      
      <div className="mb-4">
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Número de WhatsApp
        </label>
        <input
          type="tel"
          id="phone"
          className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="(00) 00000-0000"
          value={phoneNumber}
          onChange={handlePhoneInput}
          disabled={isLoading}
        />
        <p className="text-xs text-gray-500 mt-1">
          Formato: (DDD) XXXXX-XXXX - Apenas números do Brasil
        </p>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">
          {success}
        </div>
      )}
      
      <button
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition focus:outline-none disabled:bg-blue-300"
        onClick={setupWhatsApp}
        disabled={isLoading}
      >
        {isLoading ? 'Configurando...' : 'Configurar WhatsApp'}
      </button>
      
      <div className="mt-4">
        <h3 className="text-lg font-medium mb-2">Como funciona:</h3>
        <ol className="list-decimal list-inside text-gray-600 space-y-1">
          <li>Fornecemos seu número para gerar a conexão</li>
          <li>Você receberá uma mensagem de confirmação no WhatsApp</li>
          <li>Responda à mensagem para ativar o assistente</li>
          <li>Pronto! Seu assistente estará disponível via WhatsApp</li>
        </ol>
      </div>
    </div>
  );
};

export default WhatsAppSetup; 