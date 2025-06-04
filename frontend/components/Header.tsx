
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon, ChartPieIcon, Cog8ToothSolidIcon, ArrowLeftOnRectangleIcon, ChevronDownIcon, ServerStackIcon } from './Icons';
import { MONTH_NAMES_PT } from '../utils/dateUtils';
import type { Dashboard } from '../types';

interface HeaderProps {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onToggleView: () => void;
  currentView: 'calendar' | 'reports';
  onOpenSettings: () => void;
  onLogout?: () => void; 
  isAuthenticated?: boolean;
  activeDashboardName?: string;
  dashboards: Dashboard[] | null;
  onSelectDashboard: (dashboard: Dashboard) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentDate, 
  onPrevMonth, 
  onNextMonth, 
  onToday, 
  onToggleView, 
  currentView,
  onOpenSettings,
  onLogout,
  isAuthenticated,
  activeDashboardName,
  dashboards,
  onSelectDashboard
}) => {
  const monthName = MONTH_NAMES_PT[currentDate.getMonth()];
  const year = currentDate.getFullYear();
  const [isDashboardDropdownOpen, setIsDashboardDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const canSwitchDashboards = dashboards && dashboards.length > 1;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDashboardDropdownOpen(false);
      }
    };
    if (isDashboardDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDashboardDropdownOpen]);

  const handleDashboardSelect = (dashboard: Dashboard) => {
    onSelectDashboard(dashboard);
    setIsDashboardDropdownOpen(false);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mb-6 px-2 py-3 bg-slate-800 rounded-lg shadow-md">
      <div className="flex items-center mb-3 sm:mb-0 flex-grow sm:flex-grow-0">
        {/* Dashboard Switcher / Name */}
        <div className="relative mr-2 sm:mr-4" ref={dropdownRef}>
            <button 
                onClick={() => canSwitchDashboards && setIsDashboardDropdownOpen(!isDashboardDropdownOpen)}
                className={`flex items-center p-2 rounded-md transition-colors text-white text-base sm:text-lg font-semibold ${canSwitchDashboards ? 'hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500' : 'cursor-default'}`}
                disabled={!canSwitchDashboards}
                aria-haspopup="true"
                aria-expanded={isDashboardDropdownOpen}
                title={canSwitchDashboards ? "Trocar dashboard" : "Dashboard ativo"}
            >
                <ServerStackIcon className="w-5 h-5 mr-1.5 text-sky-400" />
                <span className="truncate max-w-[120px] sm:max-w-[200px]">{activeDashboardName || 'Dashboard'}</span>
                {canSwitchDashboards && <ChevronDownIcon className={`w-4 h-4 ml-1 transition-transform duration-200 ${isDashboardDropdownOpen ? 'transform rotate-180' : ''}`} />}
            </button>
            {isDashboardDropdownOpen && canSwitchDashboards && (
            <div className="absolute top-full mt-1.5 left-0 w-60 bg-slate-700 rounded-md shadow-lg z-20 py-1 border border-slate-600">
              {dashboards?.map(d => (
                <button
                  key={d.id}
                  onClick={() => handleDashboardSelect(d)}
                  className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-sky-600 hover:text-white transition-colors block truncate"
                  role="menuitem"
                >
                  {d.name}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {currentView === 'calendar' && (
          <>
            <button
              onClick={onPrevMonth}
              className="p-2 rounded-md hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
              aria-label="Mês anterior"
            >
              <ChevronLeftIcon className="w-6 h-6 text-slate-400" />
            </button>
            <h2 className="text-xl md:text-2xl font-semibold text-white mx-1 sm:mx-3 w-32 sm:w-40 text-center">
              {monthName} {year}
            </h2>
            <button
              onClick={onNextMonth}
              className="p-2 rounded-md hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
              aria-label="Próximo mês"
            >
              <ChevronRightIcon className="w-6 h-6 text-slate-400" />
            </button>
          </>
        )}
        {currentView === 'reports' && (
          <h2 className="text-xl md:text-2xl font-semibold text-white mx-2 sm:mx-4">
            Relatórios
          </h2>
        )}
      </div>
      <div className="flex items-center space-x-2">
        {currentView === 'calendar' && (
          <button
            onClick={onToday}
            className="px-3 py-2 bg-sky-600 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800"
          >
            Hoje
          </button>
        )}
        <button
          onClick={onToggleView}
          className="px-3 py-2 bg-indigo-600 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-800 flex items-center space-x-1.5"
          aria-label={currentView === 'calendar' ? "Ver Relatórios" : "Ver Calendário"}
        >
          {currentView === 'calendar' ? (
            <>
              <ChartPieIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Relatórios</span>
            </>
          ) : (
            <>
              <CalendarDaysIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Calendário</span>
            </>
          )}
        </button>
        {isAuthenticated && (
             <button
                onClick={onOpenSettings}
                className="p-2 bg-slate-700 text-white rounded-md hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                aria-label="Abrir configurações"
                title="Configurações"
            >
                <Cog8ToothSolidIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
        )}
        {isAuthenticated && onLogout && (
          <button
            onClick={onLogout}
            className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-800"
            aria-label="Sair"
            title="Sair"
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}
      </div>
    </div>
  );
};
