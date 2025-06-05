import React, { useState, useEffect } from 'react';
import { DatabaseIcon, Cog8ToothSolidIcon, KeyIcon } from './Icons';
import { apiClient } from '../utils/apiClient';
import type { SetupStatusResponse } from '../types';

interface PostgresGetStartedScreenProps {
  onSetupSuccess: () => void;
  initialMessage?: string;
}

export const PostgresGetStartedScreen: React.FC<PostgresGetStartedScreenProps> = ({ onSetupSuccess, initialMessage }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [processMessage, setProcessMessage] = useState(initialMessage || '');
  const [processErrorOccurred, setProcessErrorOccurred] = useState(false);
  const [showReloadButton, setShowReloadButton] = useState(false);

  useEffect(() => {
    if (initialMessage) {
      const isError = !initialMessage.toLowerCase().includes('sucesso') && 
                      !initialMessage.toLowerCase().includes('configurado') &&
                      !initialMessage.toLowerCase().includes('bem-sucedida'); // Added more success keywords
      setProcessErrorOccurred(isError);
      if (isError && initialMessage.includes("DATABASE_URL")) { // If initial message indicates DB_URL issue
        setShowReloadButton(true);
      }
    }
  }, [initialMessage]);

  const handleVerifyAndSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setProcessMessage('Verificando configuração do banco de dados...');
    setProcessErrorOccurred(false);
    setShowReloadButton(false);

    try {
      // Call initialize without postgresUrl in the body; backend uses its .env
      const response = await apiClient.post<SetupStatusResponse>('/setup/initialize', {}, { useAuth: false });
      
      setProcessMessage(response.message || 'Verificação da configuração concluída.');
      
      if (response.isConfigured) {
        setProcessErrorOccurred(false);
        // onSetupSuccess might reload the page or change view in App.tsx
        // Give a small delay for the user to read the success message.
        setTimeout(() => onSetupSuccess(), 1500);
      } else {
        setProcessErrorOccurred(true);
        if (response.requiresManualEnvUpdate) {
            // Message from backend should guide to update backend .env
            // e.g., "DATABASE_URL não configurada no backend..."
            setShowReloadButton(true); 
        }
      }
    } catch (error: any) {
      console.error("Erro ao verificar/configurar PostgreSQL:", error);
      const backendMsg = error.response?.data?.message || error.message;
      const defaultErrorMsg = 'Falha ao conectar ou configurar o banco de dados. Verifique os logs do backend e a configuração de DATABASE_URL.';
      
      setProcessMessage(backendMsg || defaultErrorMsg);
      setProcessErrorOccurred(true);
      // If error message implies DATABASE_URL issue, show reload button
      if (backendMsg && (backendMsg.includes("DATABASE_URL") || backendMsg.includes("configure-a") || error.response?.data?.requiresManualEnvUpdate)) {
          setShowReloadButton(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-300">
      <div className="w-full max-w-lg bg-slate-800 p-6 sm:p-10 rounded-xl shadow-2xl">
        <div className="text-center mb-8">
          <DatabaseIcon className="w-16 h-16 text-sky-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white">Configurar Banco de Dados</h1>
          <p className="text-slate-400 mt-2">
            O aplicativo verificará a conexão com o banco de dados PostgreSQL e configurará as tabelas necessárias.
            Certifique-se de que a variável <code>DATABASE_URL</code> está corretamente definida no arquivo <code>.env</code> do backend.
          </p>
        </div>

        <form onSubmit={handleVerifyAndSetup} className="space-y-6">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 rounded-md transition-colors duration-150 flex items-center justify-center space-x-2 disabled:opacity-60"
          >
            <Cog8ToothSolidIcon className="w-5 h-5" />
            <span>{isLoading ? 'Processando...' : 'Verificar e Configurar Banco de Dados'}</span>
          </button>
        </form>
        
        {processMessage && (
            <div className={`text-sm mt-6 p-3 rounded-md whitespace-pre-wrap ${processErrorOccurred ? 'bg-red-900 bg-opacity-40 text-red-300' : 'bg-emerald-900 bg-opacity-40 text-emerald-300'}`}>
                <p className="font-semibold mb-1">{processErrorOccurred ? 'Erro na Configuração:' : 'Status da Configuração:'}</p>
                {processMessage.split('\n').map((line, index) => (
                    <span key={index}>{line}<br/></span>
                ))}
            </div>
        )}

        {showReloadButton && !isLoading && (
             <div className="mt-4 text-center">
                <p className="text-amber-400 text-sm mb-2">
                    Se você atualizou o arquivo <code>.env</code> do backend e reiniciou o servidor, recarregue esta página para tentar novamente.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-md"
                >
                    Recarregar Página
                </button>
            </div>
        )}
      </div>
       <footer className="text-center text-xs text-slate-600 mt-12">
        Verifique os logs do console do backend para mais detalhes em caso de erros persistentes.
      </footer>
    </div>
  );
};
