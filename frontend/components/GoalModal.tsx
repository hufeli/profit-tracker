
import React, { useState, useEffect, useMemo } from 'react';
import type { Goal, GoalType, CurrencyCode } from '../types';
import { XMarkIcon, TrophyIcon, PlusCircleIcon, TrashIcon, PencilIcon } from './Icons';
import { formatDateKey, getWeekId, getMonthId, MONTH_NAMES_PT, formatCurrency } from '../utils/dateUtils';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: Goal) => void;
  existingGoal?: Goal | null;
  goals: Goal[];
  onDeleteGoal: (goalId: string) => void;
  onEditGoal: (goal: Goal) => void;
  onAddNewGoal: () => void;
  currency: CurrencyCode;
}

const getTargetDateDisplay = (type: GoalType, appliesTo: string): string => {
    if (type === 'daily') return appliesTo; // YYYY-MM-DD
    if (type === 'weekly') { // YYYY-WNN
        const [year, weekNum] = appliesTo.split('-W');
        return `Semana ${weekNum} de ${year}`;
    }
    if (type === 'monthly') { // YYYY-MM
        const [year, month] = appliesTo.split('-');
        return `${MONTH_NAMES_PT[parseInt(month,10)-1]} de ${year}`;
    }
    return appliesTo;
}

export const GoalModal: React.FC<GoalModalProps> = ({ 
    isOpen, onClose, onSave, existingGoal, goals, onDeleteGoal, onEditGoal, onAddNewGoal, currency 
}) => {
  const [type, setType] = useState<GoalType>('daily');
  const [amount, setAmount] = useState('');
  const [targetDate, setTargetDate] = useState(formatDateKey(new Date())); // For daily goal
  const [selectedWeek, setSelectedWeek] = useState(getWeekId(new Date())); // For weekly goal
  const [selectedMonth, setSelectedMonth] = useState(getMonthId(new Date())); // For monthly goal

  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (isOpen) {
        if (existingGoal) {
            setType(existingGoal.type);
            setAmount(existingGoal.amount.toString());
            if (existingGoal.type === 'daily') setTargetDate(existingGoal.appliesTo);
            if (existingGoal.type === 'weekly') setSelectedWeek(existingGoal.appliesTo);
            if (existingGoal.type === 'monthly') setSelectedMonth(existingGoal.appliesTo);
            setShowForm(true);
        } else {
            // Reset form for new goal, but don't show it immediately unless triggered
            setType('daily');
            setAmount('');
            setTargetDate(formatDateKey(new Date()));
            setSelectedWeek(getWeekId(new Date()));
            setSelectedMonth(getMonthId(new Date()));
            setShowForm(false); // Hide form by default, show list
        }
    }
  }, [isOpen, existingGoal]);

  const handleAddNewClick = () => {
    onAddNewGoal(); // This will call useEffect above to reset form state via existingGoal being null
    setShowForm(true);
  };
  
  const handleEditClick = (goal: Goal) => {
    onEditGoal(goal); // This will call useEffect to populate form
    setShowForm(true);
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Por favor, insira um valor de meta válido e positivo.');
      return;
    }

    let appliesToValue = '';
    if (type === 'daily') appliesToValue = targetDate;
    else if (type === 'weekly') appliesToValue = selectedWeek;
    else if (type === 'monthly') appliesToValue = selectedMonth;

    onSave({
      id: existingGoal?.id || crypto.randomUUID(),
      type,
      amount: numAmount,
      appliesTo: appliesToValue,
    });
    setShowForm(false); // Hide form, show list after save
  };
  
  const sortedGoals = useMemo(() => {
    return [...goals].sort((a, b) => {
        if (a.appliesTo < b.appliesTo) return -1;
        if (a.appliesTo > b.appliesTo) return 1;
        return 0;
    });
  }, [goals]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-slate-800 p-6 sm:p-8 rounded-lg shadow-2xl w-full max-w-2xl transform transition-all max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-white flex items-center">
            <TrophyIcon className="w-7 h-7 mr-2 text-amber-400" />
            Gerenciar Metas de Lucro
          </h2>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:bg-slate-700 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {showForm ? (
          <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-2">
            <div>
              <label htmlFor="goalType" className="block text-sm font-medium text-slate-300 mb-1">Tipo de Meta</label>
              <select id="goalType" value={type} onChange={(e) => setType(e.target.value as GoalType)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:ring-2 focus:ring-sky-500">
                <option value="daily">Diária</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
              </select>
            </div>

            {type === 'daily' && (
              <div>
                <label htmlFor="targetDate" className="block text-sm font-medium text-slate-300 mb-1">Data da Meta</label>
                <input type="date" id="targetDate" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:ring-2 focus:ring-sky-500" />
              </div>
            )}
            {type === 'weekly' && (
              <div>
                <label htmlFor="selectedWeek" className="block text-sm font-medium text-slate-300 mb-1">Semana da Meta (YYYY-WNN)</label>
                <input type="week" id="selectedWeek" value={selectedWeek.replace('-W','-W')} // HTML week input needs YYYY-WNN format
                    onChange={(e) => setSelectedWeek(e.target.value.replace('-W','-W'))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:ring-2 focus:ring-sky-500" />
              </div>
            )}
            {type === 'monthly' && (
              <div>
                <label htmlFor="selectedMonth" className="block text-sm font-medium text-slate-300 mb-1">Mês da Meta</label>
                <input type="month" id="selectedMonth" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:ring-2 focus:ring-sky-500" />
              </div>
            )}

            <div>
              <label htmlFor="goalAmount" className="block text-sm font-medium text-slate-300 mb-1">Valor da Meta ({currency})</label>
              <input type="text" id="goalAmount" value={amount}
                onChange={(e) => {
                    const val = e.target.value;
                    if (/^[0-9]*[,.]?[0-9]*$/.test(val)) setAmount(val);
                }}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:ring-2 focus:ring-sky-500"
                placeholder="Ex: 100,50" />
            </div>
            <div className="flex space-x-3 pt-2">
                <button type="submit" className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 rounded-md">
                    {existingGoal ? 'Atualizar Meta' : 'Adicionar Meta'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-600 hover:bg-slate-500 text-slate-200 font-semibold py-2.5 rounded-md">
                    Cancelar
                </button>
            </div>
          </form>
        ) : (
          <div className="flex-grow flex flex-col">
            <button onClick={handleAddNewClick}
              className="mb-4 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-md flex items-center justify-center space-x-2">
              <PlusCircleIcon className="w-5 h-5" />
              <span>Adicionar Nova Meta</span>
            </button>
             {sortedGoals.length === 0 && <p className="text-slate-400 text-center py-4">Nenhuma meta definida ainda.</p>}
            <ul className="space-y-2 overflow-y-auto flex-grow pr-1">
              {sortedGoals.map(goal => (
                <li key={goal.id} className="bg-slate-700 p-3 rounded-md flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-sky-400 capitalize">{goal.type === 'daily' ? 'Diária' : goal.type === 'weekly' ? 'Semanal' : 'Mensal'}</span>
                    <p className="text-slate-300 text-sm">
                        {getTargetDateDisplay(goal.type, goal.appliesTo)}: <span className="font-medium">{formatCurrency(goal.amount, currency)}</span>
                    </p>
                  </div>
                  <div className="space-x-2">
                    <button onClick={() => handleEditClick(goal)} className="p-1.5 text-slate-400 hover:text-yellow-400 rounded hover:bg-slate-600">
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => {if(confirm('Tem certeza que deseja excluir esta meta?')) onDeleteGoal(goal.id)}} className="p-1.5 text-slate-400 hover:text-red-400 rounded hover:bg-slate-600">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
