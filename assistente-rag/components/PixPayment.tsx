import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface PixPaymentProps {
  userId: string;
  amount: number;
  description: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface PixData {
  txid: string;
  qrcode: string;
  pixCopiaECola: string;
  value: number;
  expiresAt: string;
}

const PixPayment: React.FC<PixPaymentProps> = ({
  userId,
  amount,
  description,
  onSuccess,
  onCancel
}) => {
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  // Criar cobrança PIX ao montar o componente
  useEffect(() => {
    createPixCharge();
  }, []);
  
  // Timer para expiração do PIX
  useEffect(() => {
    if (pixData && pixData.expiresAt) {
      const interval = setInterval(() => {
        const expireDate = new Date(pixData.expiresAt);
        const now = new Date();
        const diffSeconds = Math.floor((expireDate.getTime() - now.getTime()) / 1000);
        
        if (diffSeconds <= 0) {
          clearInterval(interval);
          setTimeLeft(0);
        } else {
          setTimeLeft(diffSeconds);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [pixData]);
  
  // Verificar status do pagamento
  useEffect(() => {
    if (pixData && pixData.txid && !checkingStatus && paymentStatus !== 'CONCLUIDA') {
      const interval = setInterval(checkPaymentStatus, 5000); // Verificar a cada 5 segundos
      
      return () => clearInterval(interval);
    }
  }, [pixData, checkingStatus, paymentStatus]);
  
  // Função para criar cobrança PIX
  const createPixCharge = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/create-pix', {
        userId,
        amount,
        description,
        expirationMinutes: 15
      });
      
      if (response.data.success) {
        setPixData(response.data.data);
      } else {
        setError(response.data.error || 'Erro ao gerar QR Code PIX');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Erro ao conectar com o servidor');
      console.error('Erro ao criar cobrança PIX:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Função para verificar status do pagamento
  const checkPaymentStatus = async () => {
    if (!pixData?.txid || checkingStatus) return;
    
    setCheckingStatus(true);
    
    try {
      const response = await axios.get(`/api/check-pix-status?txid=${pixData.txid}`);
      
      setPaymentStatus(response.data.status);
      
      if (response.data.status === 'CONCLUIDA') {
        // Pagamento confirmado
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status do pagamento:', error);
    } finally {
      setCheckingStatus(false);
    }
  };
  
  // Função para copiar código PIX para área de transferência
  const copyPixCodeToClipboard = () => {
    if (pixData?.pixCopiaECola) {
      navigator.clipboard.writeText(pixData.pixCopiaECola).then(
        () => {
          alert('Código PIX copiado!');
        },
        (err) => {
          console.error('Erro ao copiar código PIX:', err);
        }
      );
    }
  };
  
  // Formatar tempo restante
  const formatTimeLeft = () => {
    if (timeLeft === null) return '';
    
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Pagamento via PIX</h2>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-3">Gerando QR Code...</span>
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
          <p>{error}</p>
          <button
            className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            onClick={onCancel}
          >
            Cancelar
          </button>
        </div>
      ) : paymentStatus === 'CONCLUIDA' ? (
        <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-4">
          <h3 className="font-bold text-lg mb-2">Pagamento Confirmado!</h3>
          <p>Obrigado pelo seu pagamento. Sua transação foi concluída com sucesso.</p>
          <button
            className="mt-3 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            onClick={onSuccess}
          >
            Continuar
          </button>
        </div>
      ) : pixData ? (
        <div>
          <div className="flex flex-col items-center mb-4">
            <p className="text-gray-700 mb-2">
              Valor: <span className="font-bold">R$ {pixData.value.toFixed(2)}</span>
            </p>
            
            {timeLeft !== null && (
              <p className="text-sm text-gray-500 mb-2">
                Expira em: <span className="font-mono">{formatTimeLeft()}</span>
              </p>
            )}
            
            <div className="bg-white p-2 border rounded-lg mb-4">
              {/* QR Code como imagem */}
              <img
                src={pixData.qrcode}
                alt="QR Code PIX"
                className="w-48 h-48"
              />
            </div>
            
            <div className="w-full">
              <p className="text-sm text-gray-600 mb-1">Código PIX copia e cola:</p>
              <div className="flex">
                <input
                  type="text"
                  readOnly
                  value={pixData.pixCopiaECola}
                  className="flex-1 p-2 border rounded-l-lg bg-gray-50 text-gray-500 text-xs overflow-hidden"
                />
                <button
                  onClick={copyPixCodeToClipboard}
                  className="bg-blue-600 text-white px-3 py-2 rounded-r-lg hover:bg-blue-700"
                >
                  Copiar
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-6 border-t pt-4">
            <h3 className="font-medium mb-2">Instruções:</h3>
            <ol className="list-decimal list-inside text-gray-600 space-y-1 text-sm">
              <li>Abra o aplicativo do seu banco</li>
              <li>Escolha a opção PIX (QR Code ou Copia e Cola)</li>
              <li>Escaneie o QR Code ou cole o código</li>
              <li>Confirme as informações e conclua o pagamento</li>
              <li>Após o pagamento, aguarde a confirmação nesta tela</li>
            </ol>
          </div>
          
          <button
            className="mt-4 w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
            onClick={onCancel}
          >
            Cancelar
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default PixPayment; 