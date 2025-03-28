import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface Message {
  id: string;
  isUser: boolean;
  text: string;
  timestamp: string;
}

interface AssistantChatProps {
  userId: string;
  initialMessages?: Message[];
  onSendToWhatsApp?: (message: string) => void;
}

const AssistantChat: React.FC<AssistantChatProps> = ({
  userId,
  initialMessages = [],
  onSendToWhatsApp
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Efeito para rolar para a mensagem mais recente
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Função para rolar para a mensagem mais recente
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Função para enviar mensagem para o assistente
  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    
    // Adicionar mensagem do usuário
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      isUser: true,
      text: inputText,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInputText('');
    
    try {
      // Enviar mensagem para API
      const response = await axios.post('/api/rag-assistant', {
        userId,
        message: userMessage.text
      });
      
      // Adicionar resposta do assistente
      if (response.data.success) {
        const assistantMessage: Message = {
          id: response.data.conversationId || `assistant-${Date.now()}`,
          isUser: false,
          text: response.data.message,
          timestamp: response.data.timestamp || new Date().toISOString()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      
      // Adicionar mensagem de erro
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        isUser: false,
        text: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Função para lidar com tecla Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  // Função para enviar mensagem para WhatsApp
  const handleSendToWhatsApp = (messageText: string) => {
    if (onSendToWhatsApp) {
      onSendToWhatsApp(messageText);
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Cabeçalho */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg">
        <h2 className="text-xl font-semibold">Assistente StayFocus</h2>
        <p className="text-sm">Seu assistente personalizado para TDAH</p>
      </div>
      
      {/* Área de mensagens */}
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map(message => (
          <div 
            key={message.id}
            className={`mb-4 ${message.isUser ? 'text-right' : 'text-left'}`}
          >
            <div 
              className={`inline-block p-3 rounded-lg ${
                message.isUser 
                  ? 'bg-blue-500 text-white rounded-br-none' 
                  : 'bg-gray-200 text-gray-800 rounded-bl-none'
              }`}
            >
              {message.text}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
            
            {/* Opção de enviar para WhatsApp apenas para mensagens do assistente */}
            {!message.isUser && onSendToWhatsApp && (
              <button
                onClick={() => handleSendToWhatsApp(message.text)}
                className="text-xs text-blue-500 hover:underline ml-2"
              >
                Enviar para WhatsApp
              </button>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="text-left mb-4">
            <div className="inline-block p-3 rounded-lg bg-gray-200 text-gray-800 rounded-bl-none">
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce delay-75"></div>
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Área de input */}
      <div className="border-t p-4">
        <div className="flex">
          <textarea
            className="flex-1 border rounded-l-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Digite sua mensagem..."
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 transition focus:outline-none disabled:bg-blue-300"
            onClick={sendMessage}
            disabled={isLoading || !inputText.trim()}
          >
            Enviar
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Pressione Enter para enviar, Shift+Enter para nova linha
        </p>
      </div>
    </div>
  );
};

export default AssistantChat; 