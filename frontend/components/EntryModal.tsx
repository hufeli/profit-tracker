
import React, { useState, useEffect } from 'react';
import type { Entries, CurrencyCode } from '../types';
import { formatDateKey, getPreviousBalanceForDate, MONTH_NAMES_PT, formatCurrency } from '../utils/dateUtils';
import { XMarkIcon, TagIcon, ChatBubbleLeftEllipsisIcon } from './Icons';

interface EntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (finalBalance: number, tags: string[], notes: string) => void;
  selectedDate: Date;
  initialBalance: number;
  entries: Entries;
  currentEntryData?: { finalBalance: number; tags?: string[]; notes?: string };
  currency: CurrencyCode;
}

export const EntryModal: React.FC<EntryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  selectedDate,
  initialBalance,
  entries,
  currentEntryData,
  currency,
}) => {
  const [finalBalanceInput, setFinalBalanceInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && currentEntryData) {
      setFinalBalanceInput(currentEntryData.finalBalance.toString().replace('.', ','));
      setTagsInput((currentEntryData.tags || []).join(', '));
      setNotesInput(currentEntryData.notes || '');
    } else if (isOpen) {
      setFinalBalanceInput('');
      setTagsInput('');
      setNotesInput('');
    }
    setError('');
  }, [isOpen, currentEntryData, selectedDate]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numBalance = parseFloat(finalBalanceInput.replace(',', '.'));
    if (isNaN(numBalance) || numBalance < 0) {
      setError('Por favor, insira um saldo final válido e positivo.');
      return;
    }
    const tagsArray = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    setError('');
    onSubmit(numBalance, tagsArray, notesInput);
  };

  if (!isOpen) return null;

  const dateKey = formatDateKey(selectedDate);
  const previousDayBalance = getPreviousBalanceForDate(dateKey, entries, initialBalance);
  const currentEntryBalanceNum = parseFloat(finalBalanceInput.replace(',', '.'));
  const projectedProfit = isNaN(currentEntryBalanceNum) ? 0 : currentEntryBalanceNum - previousDayBalance;

  const formattedDate = `${selectedDate.getDate()} de ${MONTH_NAMES_PT[selectedDate.getMonth()]} de ${selectedDate.getFullYear()}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-800 p-6 sm:p-8 rounded-lg shadow-2xl w-full max-w-lg transform transition-all my-auto">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-xl sm:text-2xl font-semibold text-white">Registrar Saldo</h2>
           <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:bg-slate-700 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
            aria-label="Fechar modal"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <p className="text-sm text-slate-400 mb-6">Data: {formattedDate}</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="finalBalance" className="block text-sm font-medium text-slate-300 mb-1">
              Saldo Final do Dia ({currency})
            </label>
            <input
              type="text"
              id="finalBalance"
              value={finalBalanceInput}
              onChange={(e) => {
                const value = e.target.value;
                if (/^[0-9]*[,.]?[0-9]*$/.test(value)) {
                    setFinalBalanceInput(value);
                }
              }}
              className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-md text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none placeholder-slate-500 text-lg"
              placeholder="Ex: 1250,75"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="tags" className="flex items-center text-sm font-medium text-slate-300 mb-1">
              <TagIcon className="w-4 h-4 mr-1.5 text-slate-400"/> Tags (separadas por vírgula)
            </label>
            <input
              type="text"
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none placeholder-slate-500"
              placeholder="Ex: day-trade, acoes, win"
            />
          </div>

          <div>
            <label htmlFor="notes" className="flex items-center text-sm font-medium text-slate-300 mb-1">
             <ChatBubbleLeftEllipsisIcon className="w-4 h-4 mr-1.5 text-slate-400" /> Anotações / Diário
            </label>
            <textarea
              id="notes"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none placeholder-slate-500 resize-y"
              placeholder="Como foi seu dia de operações? Estratégias, sentimentos, etc."
            />
          </div>
          
          <div className="text-sm text-slate-400 mb-2 p-3 bg-slate-700 bg-opacity-50 rounded-md">
            <p>Saldo anterior: {formatCurrency(previousDayBalance, currency)}</p>
            {!isNaN(currentEntryBalanceNum) && (
                 <p>Lucro/Prejuízo do dia: 
                    <span className={`font-semibold ${projectedProfit > 0 ? 'text-emerald-400' : projectedProfit < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                        {formatCurrency(projectedProfit, currency)}
                    </span>
                </p>
            )}
          </div>

          {error && <p className="text-red-400 text-sm mt-2 mb-2">{error}</p>}
          <button
            type="submit"
            className="w-full mt-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800"
          >
            {currentEntryData?.finalBalance !== undefined ? 'Atualizar Saldo' : 'Salvar Saldo'}
          </button>
        </form>
      </div>
    </div>
  );
};
