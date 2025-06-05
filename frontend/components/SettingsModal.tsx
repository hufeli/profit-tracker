
import React, { useState, useEffect } from 'react';
import type { AppSettings, CurrencyCode } from '../types';
import { XMarkIcon, CurrencyDollarIcon, BellIcon, TrophyIcon, ArrowsRightLeftIcon } from './Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onOpenGoalManager: () => void;
  onSwitchDashboard: () => void;
}

const availableCurrencies: { code: CurrencyCode; name: string }[] = [
  { code: 'BRL', name: 'Real Brasileiro (BRL)' },
  { code: 'USD', name: 'Dólar Americano (USD)' },
  { code: 'EUR', name: 'Euro (EUR)' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentSettings, onSave, onOpenGoalManager, onSwitchDashboard }) => {
  const [settings, setSettings] = useState<AppSettings>(() => ({
    ...currentSettings,
    notificationTime: currentSettings.notificationTime || '',
  }));

  useEffect(() => {
    if (isOpen) {
      setSettings({
        ...currentSettings,
        notificationTime: currentSettings.notificationTime || '',
      });
    }
  }, [isOpen, currentSettings]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setSettings(prev => ({ ...prev, [name]: checked }));
    } else {
      setSettings(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = () => {
    onSave(settings);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-slate-800 p-6 sm:p-8 rounded-lg shadow-2xl w-full max-w-lg transform transition-all">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-white">Configurações</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:bg-slate-700 hover:text-white"
            aria-label="Fechar modal"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Currency Settings */}
          <div>
            <label htmlFor="currency" className="flex items-center text-sm font-medium text-slate-300 mb-1">
              <CurrencyDollarIcon className="w-5 h-5 mr-2 text-slate-400" /> Moeda Padrão
            </label>
            <select
              id="currency"
              name="currency"
              value={settings.currency}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              {availableCurrencies.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Notification Settings */}
          <div>
            <label className="flex items-center text-sm font-medium text-slate-300 mb-1">
                <BellIcon className="w-5 h-5 mr-2 text-slate-400" /> Lembretes de Registro
            </label>
            <div className="flex items-center space-x-4 bg-slate-700 bg-opacity-50 p-3 rounded-md">
              <label htmlFor="enableNotifications" className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  id="enableNotifications"
                  name="enableNotifications"
                  checked={!!settings.enableNotifications}
                  onChange={handleChange}
                  className="form-checkbox h-5 w-5 text-sky-500 bg-slate-600 border-slate-500 rounded focus:ring-sky-500"
                />
                <span className="text-slate-300 text-sm">Ativar notificações</span>
              </label>
              {settings.enableNotifications && (
                <div className="flex items-center">
                    <label htmlFor="notificationTime" className="text-sm text-slate-400 mr-2">Horário:</label>
                    <input
                    type="time"
                    id="notificationTime"
                    name="notificationTime"
                    value={settings.notificationTime || ''}
                    onChange={handleChange}
                    className="px-2 py-1 bg-slate-600 border border-slate-500 rounded-md text-white text-sm focus:ring-1 focus:ring-sky-500"
                    />
                </div>
              )}
            </div>
            {settings.enableNotifications && Notification.permission !== "granted" && (
                <p className="text-xs text-amber-400 mt-1.5">As notificações do navegador precisam ser permitidas.</p>
            )}
          </div>
          
          {/* Goal Management */}
           <div>
            <label className="flex items-center text-sm font-medium text-slate-300 mb-1">
                <TrophyIcon className="w-5 h-5 mr-2 text-slate-400" /> Gerenciar Metas
            </label>
           <button
               onClick={onOpenGoalManager}
               className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md transition-colors duration-150 flex items-center justify-center space-x-2"
           >
               <TrophyIcon className="w-5 h-5" />
               <span>Abrir Gerenciador de Metas</span>
           </button>
          </div>

          {/* Dashboard Switch */}
          <div>
            <label className="flex items-center text-sm font-medium text-slate-300 mb-1">
                <ArrowsRightLeftIcon className="w-5 h-5 mr-2 text-slate-400" /> Trocar Dashboard
            </label>
            <button
                onClick={() => { onClose(); onSwitchDashboard(); }}
                className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md transition-colors duration-150 flex items-center justify-center space-x-2"
            >
                <ArrowsRightLeftIcon className="w-5 h-5" />
                <span>Escolher Outro Dashboard</span>
            </button>
          </div>


          <div className="mt-8 pt-6 border-t border-slate-700 border-opacity-50">
            <button
              onClick={handleSave}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 rounded-md transition-colors duration-150"
            >
              Salvar Configurações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
