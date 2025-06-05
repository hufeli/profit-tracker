
import React, { useState } from 'react';
import { KeyIcon, ArrowRightOnRectangleIcon, UserPlusIcon, EnvelopeIcon } from './Icons';
import { apiClient } from '../utils/apiClient'; // New API client
import type { AuthenticatedUser } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (token: string, user: AuthenticatedUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // For registration
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      let response;
      if (isSignUp) {
        response = await apiClient.post('/auth/register', { email, password, username });
        setMessage(response.message || 'Cadastro realizado com sucesso! Por favor, faça o login.');
        setIsSignUp(false); // Switch to login view after successful registration
        // Clear fields for login
        setPassword('');
        setUsername('');

      } else {
        response = await apiClient.post('/auth/login', { email, password });
        if (response.token && response.user) {
          onLoginSuccess(response.token, response.user);
        } else {
          throw new Error("Token ou dados do usuário ausentes na resposta do login.");
        }
      }
    } catch (err: any) {
        console.error(isSignUp ? 'Sign up error:' : 'Sign in error:', err);
        const errorMessage = err.response?.data?.message || err.message || (isSignUp ? 'Erro ao cadastrar.' : 'Erro ao fazer login.');
        setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-sky-500">Profit Tracker</h1>
          <p className="text-slate-400 mt-1">Acompanhe seus lucros diariamente.</p>
        </div>
        <div className="bg-slate-800 p-6 sm:p-8 rounded-xl shadow-2xl">
          <h2 className="text-2xl font-semibold text-white text-center mb-6">
            {isSignUp ? 'Criar Conta' : 'Login'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="email" id="email" name="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-700 border border-slate-600 rounded-md text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none placeholder-slate-500 text-base"
                  placeholder="seu@email.com" required autoFocus={!isSignUp}
                />
              </div>
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-1">
                  Nome de Usuário (opcional)
                </label>
                <input
                  type="text" id="username" name="username" value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-md text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none placeholder-slate-500 text-base"
                  placeholder="Seu nome de usuário"
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyIcon className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="password" id="password" name="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-700 border border-slate-600 rounded-md text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none placeholder-slate-500 text-base"
                  placeholder={isSignUp ? "Mínimo 6 caracteres" : "Sua senha"}
                  required minLength={isSignUp ? 6 : undefined} autoFocus={isSignUp}
                />
              </div>
            </div>

            {error && <p className="text-red-400 text-sm text-center bg-red-900 bg-opacity-30 p-2 rounded-md">{error}</p>}
            {message && <p className="text-emerald-400 text-sm text-center bg-emerald-900 bg-opacity-30 p-2 rounded-md">{message}</p>}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 flex items-center justify-center space-x-2 disabled:opacity-70"
            >
              {isSignUp ? <UserPlusIcon className="w-5 h-5" /> : <ArrowRightOnRectangleIcon className="w-5 h-5" />}
              <span>{loading ? 'Processando...' : (isSignUp ? 'Cadastrar' : 'Entrar')}</span>
            </button>
          </form>
          <p className="text-sm text-slate-400 mt-6 text-center">
            {isSignUp ? 'Já tem uma conta?' : 'Não tem uma conta?'}
            <button onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
              className="font-medium text-sky-500 hover:text-sky-400 ml-1 focus:outline-none">
              {isSignUp ? 'Faça Login' : 'Cadastre-se'}
            </button>
          </p>
        </div>
      </div>
       <footer className="text-center text-xs text-slate-600 mt-12">
        &copy; {new Date().getFullYear()} Profit Tracker App.
      </footer>
    </div>
  );
};
