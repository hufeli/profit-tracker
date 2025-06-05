
import React from 'react';
import type { CalculatedDayData, CurrencyCode } from '../types';
import { XMarkIcon, TagIcon, ChatBubbleLeftEllipsisIcon, PencilIcon } from './Icons';
import { formatCurrency, MONTH_NAMES_PT } from '../utils/dateUtils';

interface DayDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayData: CalculatedDayData;
  currency: CurrencyCode;
  onEditEntry: (date: Date) => void;
}

export const DayDetailsModal: React.FC<DayDetailsModalProps> = ({ isOpen, onClose, dayData, currency, onEditEntry }) => {
  if (!isOpen || !dayData) return null;

  const { date, profit, tags, notes } = dayData;
  const formattedDate = `${date.getDate()} de ${MONTH_NAMES_PT[date.getMonth()]} de ${date.getFullYear()}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-slate-800 p-6 sm:p-8 rounded-lg shadow-2xl w-full max-w-md transform transition-all">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-white">Detalhes do Dia</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:bg-slate-700 hover:text-white"
            aria-label="Fechar modal"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <p className="text-lg text-sky-400 mb-1">{formattedDate}</p>
        {profit !== undefined && (
            <p className={`text-2xl font-bold mb-4 ${profit > 0 ? 'text-emerald-400' : profit < 0 ? 'text-red-400' : 'text-slate-300'}`}>
                {formatCurrency(profit, currency)}
            </p>
        )}
        {!dayData.entryExists && <p className="text-slate-400 mb-4">Nenhum registro para este dia.</p>}

        {tags && tags.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-slate-400 mb-1 flex items-center"><TagIcon className="w-4 h-4 mr-1.5"/>Tags</h3>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-slate-700 text-sky-300 text-xs rounded-full">{tag}</span>
              ))}
            </div>
          </div>
        )}

        {notes && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-400 mb-1 flex items-center"><ChatBubbleLeftEllipsisIcon className="w-4 h-4 mr-1.5"/>Anotações</h3>
            <p className="text-sm text-slate-300 bg-slate-700 bg-opacity-50 p-3 rounded whitespace-pre-wrap max-h-40 overflow-y-auto">{notes}</p>
          </div>
        )}

        {(!tags || tags.length === 0) && !notes && dayData.entryExists && (
            <p className="text-slate-400 text-sm mb-6 italic">Nenhuma tag ou anotação para este dia.</p>
        )}
        
        {dayData.isCurrentMonth && ( // Only allow editing for current month days for now
             <button
                onClick={() => onEditEntry(dayData.date)}
                className="w-full mt-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 rounded-md transition-colors duration-150 flex items-center justify-center space-x-2"
            >
                <PencilIcon className="w-4 h-4"/>
                <span>{dayData.entryExists ? 'Editar Registro' : 'Adicionar Registro'}</span>
            </button>
        )}
      </div>
    </div>
  );
};

