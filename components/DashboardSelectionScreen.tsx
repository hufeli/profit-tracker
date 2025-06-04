
import React, { useState } from 'react';
import type { Dashboard } from '../types';
import { apiClient } from '../utils/apiClient';
import { PlusCircleIcon, ChevronRightIcon } from './Icons'; // Assuming you have these icons

interface DashboardSelectionScreenProps {
  dashboards: Dashboard[];
  onDashboardSelected: (dashboard: Dashboard) => void;
  onCreateDashboard: (name: string) => Promise<Dashboard | null>; // Returns the new dashboard or null
  currentUserId?: string; // Optional, for display or future use
}

export const DashboardSelectionScreen: React.FC<DashboardSelectionScreenProps> = ({
  dashboards,
  onDashboardSelected,
  onCreateDashboard,
  currentUserId
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateDashboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDashboardName.trim()) {
      setError('O nome do dashboard não pode estar vazio.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const newDashboard = await onCreateDashboard(newDashboardName.trim());
      if (newDashboard) {
        setNewDashboardName('');
        setShowCreateForm(false);
        // onDashboardSelected(newDashboard); // Or App.tsx handles re-fetch and auto-select
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Falha ao criar dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-300">
      <div className="w-full max-w-md bg-slate-800 p-6 sm:p-8 rounded-xl shadow-2xl">
        <h1 className="text-3xl font-bold text-white text-center mb-2">Seus Dashboards</h1>
        <p className="text-slate-400 text-center mb-6">
          Selecione um dashboard para continuar ou crie um novo.
        </p>

        {dashboards.length > 0 && !showCreateForm && (
          <ul className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2">
            {dashboards.map((dashboard) => (
              <li key={dashboard.id}>
                <button
                  onClick={() => onDashboardSelected(dashboard)}
                  className="w-full text-left p-4 bg-slate-700 hover:bg-sky-700 rounded-lg transition-colors duration-150 flex justify-between items-center"
                >
                  <span className="font-medium text-lg text-slate-100">{dashboard.name}</span>
                  <ChevronRightIcon className="w-5 h-5 text-sky-400" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {dashboards.length === 0 && !showCreateForm && (
          <p className="text-center text-slate-500 my-8">
            Você ainda não tem dashboards. Crie um para começar!
          </p>
        )}

        {showCreateForm ? (
          <form onSubmit={handleCreateDashboard} className="space-y-4 my-6">
            <div>
              <label htmlFor="newDashboardName" className="block text-sm font-medium text-slate-300 mb-1">
                Nome do Novo Dashboard
              </label>
              <input
                type="text"
                id="newDashboardName"
                value={newDashboardName}
                onChange={(e) => setNewDashboardName(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-md text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none placeholder-slate-500"
                placeholder="Ex: Day Trade Estratégia X"
                required
                autoFocus
                disabled={isLoading}
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-grow bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 rounded-md flex items-center justify-center space-x-2 disabled:opacity-70"
              >
                <PlusCircleIcon className="w-5 h-5" />
                <span>{isLoading ? 'Criando...' : 'Criar Dashboard'}</span>
              </button>
              <button
                type="button"
                onClick={() => { setShowCreateForm(false); setError(''); setNewDashboardName(''); }}
                disabled={isLoading}
                className="flex-grow bg-slate-600 hover:bg-slate-500 text-slate-200 font-semibold py-2.5 rounded-md disabled:opacity-70"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => { setShowCreateForm(true); setError(''); }}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-md flex items-center justify-center space-x-2"
          >
            <PlusCircleIcon className="w-5 h-5" />
            <span>Criar Novo Dashboard</span>
          </button>
        )}
         <p className="text-xs text-slate-500 mt-6 text-center">
            Cada dashboard opera com seu próprio saldo inicial, registros e metas.
        </p>
      </div>
    </div>
  );
};
