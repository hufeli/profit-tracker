
import React, { useState } from 'react';
import { XMarkIcon } from './Icons';
import type { CurrencyCode } from '../types';
import { formatCurrency } from '../utils/dateUtils'; // Assuming formatCurrency is in dateUtils

interface InitialBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (balance: number) => void;
  currency: CurrencyCode;
}

export const InitialBalanceModal: React.FC<InitialBalanceModalProps> = ({ isOpen, onClose, onSubmit, currency }) => {
  const [balance, setBalance] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numBalance = parseFloat(balance.replace(',', '.')); // Handle comma as decimal separator
    if (isNaN(numBalance) || numBalance < 0) {
      setError('Por favor, insira um valor de saldo válido e positivo.');
      return;
    }
    setError('');
    onSubmit(numBalance);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-slate-800 p-6 sm:p-8 rounded-lg shadow-2xl w-full max-w-md transform transition-all">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-white">Saldo Inicial</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:bg-slate-700 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
            aria-label="Fechar modal"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <p className="text-slate-400 mb-4 text-sm">
            Para começar a acompanhar seus lucros, por favor, informe seu saldo inicial. Este valor será a base para calcular seus ganhos.
          </p>
          <div>
            <label htmlFor="initialBalance" className="block text-sm font-medium text-slate-300 mb-1">
              Valor do Saldo Inicial ({currency})
            </label>
            <input
              type="text"
              id="initialBalance"
              value={balance}
              onChange={(e) => {
                const value = e.target.value;
                if (/^[0-9]*[,.]?[0-9]*$/.test(value)) {
                    setBalance(value);
                }
              }}
              className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-md text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none placeholder-slate-500 text-lg"
              placeholder={`Ex: ${currency === 'BRL' ? '1000,50' : '1000.50'}`}
              autoFocus
            />
          </div>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          <button
            type="submit"
            className="w-full mt-6 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800"
          >
            Salvar Saldo Inicial
          </button>
        </form>
      </div>
    </div>
  );
};
