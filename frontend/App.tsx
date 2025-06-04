
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { CalendarGrid } from './components/CalendarGrid';
import { InitialBalanceModal } from './components/InitialBalanceModal';
import { EntryModal } from './components/EntryModal';
import { ReportsView } from './components/ReportsView';
import { LoginScreen } from './components/LoginScreen';
import { SettingsModal } from './components/SettingsModal';
import { GoalModal } from './components/GoalModal';
import { DayDetailsModal } from './components/DayDetailsModal';
import { PostgresGetStartedScreen } from './components/PostgresGetStartedScreen';
import { DashboardSelectionScreen } from './components/DashboardSelectionScreen'; // New
import type { Entries, CurrencyCode, AppSettings, Goal, CalculatedDayData, DailyEntry, AuthenticatedUser, SetupStatusResponse, Dashboard } from './types';
import { formatDateKey, getPreviousBalanceForDate, formatCurrency } from './utils/dateUtils';
import { requestNotificationPermission, scheduleNotificationCheck } from './utils/notificationUtils';
import { apiClient } from './utils/apiClient';
import { goalFromApi, goalToApi } from './utils/apiMappers';

type ViewMode = 'calendar' | 'reports';

const AUTH_TOKEN_KEY = 'profitTrackerAuthToken';
const USER_INFO_KEY = 'profitTrackerUserInfo';

const DEFAULT_SETTINGS: AppSettings = {
  currency: 'BRL',
  enableNotifications: false,
  notificationTime: '18:00',
};

const App: React.FC = () => {
  const [isBackendSetupComplete, setIsBackendSetupComplete] = useState<boolean | null>(null);
  const [setupStatusMessage, setSetupStatusMessage] = useState<string>('');

  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(() => {
    const storedUser = localStorage.getItem(USER_INFO_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [dashboards, setDashboards] = useState<Dashboard[] | null>(null);
  const [activeDashboard, setActiveDashboard] = useState<Dashboard | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCheckingSetup, setIsCheckingSetup] = useState<boolean>(true);
  const [isLoadingDashboards, setIsLoadingDashboards] = useState<boolean>(false);


  const [currentDate, setCurrentDate] = useState(new Date());
  const [initialBalance, setInitialBalance] = useState<number | null>(null);
  const [entries, setEntries] = useState<Entries>({});
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [goals, setGoals] = useState<Goal[]>([]);
  
  const [isInitialBalanceModalOpen, setIsInitialBalanceModalOpen] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isDayDetailsModalOpen, setIsDayDetailsModalOpen] = useState(false);
  
  const [selectedDateForEntry, setSelectedDateForEntry] = useState<Date | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [detailedDayData, setDetailedDayData] = useState<CalculatedDayData | null>(null);
  
  const [currentView, setCurrentView] = useState<ViewMode>('calendar');

  const isAuthenticated = !!token && !!currentUser;

  // Check backend setup status on initial load
  useEffect(() => {
    const checkBackendSetup = async () => {
      setIsCheckingSetup(true);
      try {
        const statusResponse = await apiClient.get<SetupStatusResponse>('/setup/status', { useAuth: false });
        setIsBackendSetupComplete(statusResponse.isConfigured);
        setSetupStatusMessage(statusResponse.message || (statusResponse.isConfigured ? 'Backend configurado.' : 'Backend precisa de configuração.'));
      } catch (error) {
        console.error("Error checking backend setup status:", error);
        setIsBackendSetupComplete(false);
        setSetupStatusMessage('Não foi possível verificar o status do backend. A configuração pode ser necessária.');
      } finally {
        setIsCheckingSetup(false);
      }
    };
    checkBackendSetup();
  }, []);

  // Fetch dashboards after login or if token exists but dashboards not loaded
  const fetchUserDashboards = useCallback(async () => {
    if (!isAuthenticated || !isBackendSetupComplete) return;
    setIsLoadingDashboards(true);
    try {
      const fetchedDashboards = await apiClient.get<Dashboard[]>('/dashboards');
      setDashboards(fetchedDashboards);
      // Auto-select if only one dashboard is available
      if (fetchedDashboards.length === 1) {
        setActiveDashboard(fetchedDashboards[0]);
      }
    } catch (error) {
      console.error("Error fetching dashboards:", error);
      setDashboards([]); // Set to empty array on error to show create prompt
    } finally {
      setIsLoadingDashboards(false);
    }
  }, [isAuthenticated, isBackendSetupComplete]);

  useEffect(() => {
    if (isAuthenticated && isBackendSetupComplete && dashboards === null) {
      fetchUserDashboards();
    }
  }, [isAuthenticated, isBackendSetupComplete, dashboards, fetchUserDashboards]);


  // Data load effect (scoped to activeDashboard in Iteration 2)
  useEffect(() => {
    const loadAppData = async () => {
      if (!activeDashboard || !isAuthenticated || !isBackendSetupComplete) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      apiClient.setToken(token); // Ensure token is set for apiClient

      try {
        const [settingsData, balanceData, entriesData, goalsData] = await Promise.all([
          apiClient.get<AppSettings | null>(`/settings?dashboardId=${activeDashboard.id}`),
          apiClient.get<{ balance: number; currency: CurrencyCode } | null>(`/initial-balance?dashboardId=${activeDashboard.id}`).catch(() => null),
          apiClient.get<Entries | null>(`/entries?dashboardId=${activeDashboard.id}`),
          apiClient.get<Goal[] | null>(`/goals?dashboardId=${activeDashboard.id}`)
        ]);

        setSettings(settingsData || { ...DEFAULT_SETTINGS, dashboard_id: activeDashboard.id });
        if (balanceData) {
          setInitialBalance(balanceData.balance);
          // Ensure initial balance modal logic correctly handles subsequent dashboard switches
          // It should only open if the NEW activeDashboard has a null initialBalance.
          setIsInitialBalanceModalOpen(false); 
        } else {
          setInitialBalance(null);
          if (isAuthenticated) setIsInitialBalanceModalOpen(true);
        }
        setEntries(entriesData || {});
        setGoals((goalsData || []).map(goalFromApi));

      } catch (error) {
        console.error("Error loading user data for dashboard:", error);
        if ((error as any)?.response?.status === 401 || (error as any)?.response?.status === 400) {
           handleLogout(); // Full logout if auth error
        } else { // Reset data for current dashboard on other errors
          setInitialBalance(null);
          setEntries({});
          setSettings({ ...DEFAULT_SETTINGS, dashboard_id: activeDashboard.id });
          setGoals([]);
          if (isAuthenticated) setIsInitialBalanceModalOpen(true);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    let intervalId: number | undefined;

    if (activeDashboard && token && currentUser && isBackendSetupComplete) {
        loadAppData();
        intervalId = window.setInterval(loadAppData, 30000); // refresh every 30s
    } else if (isBackendSetupComplete && !token) {
        setIsLoading(false);
        setInitialBalance(null); setEntries({}); setSettings(DEFAULT_SETTINGS); setGoals([]); setActiveDashboard(null); setDashboards(null);
    } else if (isBackendSetupComplete === false) {
        setIsLoading(false);
    }

    return () => { if (intervalId) clearInterval(intervalId); };
  }, [token, currentUser, isBackendSetupComplete, activeDashboard]);


  // Notification logic
  useEffect(() => {
    if (isBackendSetupComplete && isAuthenticated && activeDashboard && settings.enableNotifications) {
      requestNotificationPermission();
      const intervalId = scheduleNotificationCheck(entries, settings.notificationTime, settings.currency, initialBalance ?? 0);
      return () => clearInterval(intervalId);
    }
  }, [isBackendSetupComplete, settings.enableNotifications, settings.notificationTime, entries, isAuthenticated, settings.currency, initialBalance, activeDashboard]);

  const handleLoginSuccess = useCallback(async (newToken: string, userData: AuthenticatedUser) => {
    localStorage.setItem(AUTH_TOKEN_KEY, newToken);
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(userData));
    setToken(newToken);
    setCurrentUser(userData);
    apiClient.setToken(newToken);
    setDashboards(null);
    setActiveDashboard(null);
    await fetchUserDashboards();
  }, [fetchUserDashboards]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_INFO_KEY);
    setToken(null);
    setCurrentUser(null);
    apiClient.setToken(null);
    setInitialBalance(null);
    setEntries({});
    setSettings(DEFAULT_SETTINGS);
    setGoals([]);
    setDashboards(null);
    setActiveDashboard(null);
    setCurrentView('calendar');
  }, []);

  const handleDashboardSelected = useCallback((dashboard: Dashboard) => {
    setActiveDashboard(dashboard);
    // Reset view specific states if necessary, or let useEffect on activeDashboard handle data load
    // e.g., if current view is reports, and you switch dashboard, it should still be reports
    // but data for the new dashboard's reports will be loaded.
  }, []);

  const handleCreateDashboard = useCallback(async (name: string): Promise<Dashboard | null> => {
    if (!isAuthenticated) return null;
    try {
      const newDashboard = await apiClient.post<Dashboard>('/dashboards', { name });
      await fetchUserDashboards(); // Re-fetch dashboards to include the new one
      // Select the newly created dashboard
      setActiveDashboard(newDashboard);
      return newDashboard;
    } catch (error) {
      console.error("Error creating dashboard:", error);
      throw error;
    }
  }, [isAuthenticated, fetchUserDashboards]);


  const handleSetInitialBalance = useCallback(async (balance: number, currency: CurrencyCode) => {
    if (!isAuthenticated || !activeDashboard) return;
    try {
      const updatedBalanceData = await apiClient.post<{balance: number, currency: CurrencyCode}>(`/initial-balance?dashboardId=${activeDashboard.id}`, { balance, currency });
      setInitialBalance(updatedBalanceData.balance);
      if (settings.currency !== updatedBalanceData.currency) {
          setSettings(s => ({...s, currency: updatedBalanceData.currency}));
      }
      setIsInitialBalanceModalOpen(false);
    } catch (error) {
      console.error("Error setting initial balance:", error);
      alert("Falha ao salvar saldo inicial. Tente novamente.");
    }
  }, [isAuthenticated, settings.currency, activeDashboard]);

  const handleSaveEntry = useCallback(async (date: Date, finalBalance: number, tags: string[], notes: string) => {
    if (!isAuthenticated || !activeDashboard) return;
    const dateKey = formatDateKey(date);
    try {
      const entryData = { date_key: dateKey, final_balance: finalBalance, tags, notes, dashboard_id: activeDashboard.id };
      const savedEntry = await apiClient.post<Entries>('/entries', entryData); 
      setEntries(prevEntries => ({ ...prevEntries, ...savedEntry }));
      setIsEntryModalOpen(false);
      setSelectedDateForEntry(null);
    } catch (error) {
      console.error("Error saving entry:", error);
      alert("Falha ao salvar registro. Tente novamente.");
    }
  }, [isAuthenticated, activeDashboard]);

  const handleEntryModalSubmit = useCallback((finalBalance: number, tags: string[], notes: string) => {
    if (selectedDateForEntry) {
        handleSaveEntry(selectedDateForEntry, finalBalance, tags, notes);
    }
  }, [handleSaveEntry, selectedDateForEntry]);

  const handleSaveSettings = useCallback(async (newSettings: AppSettings) => {
    if (!isAuthenticated || !activeDashboard) return;
    try {
      const settingsToSave = { ...newSettings, dashboard_id: activeDashboard.id };
      const savedSettings = await apiClient.post<AppSettings>('/settings', settingsToSave);
      setSettings(savedSettings);
      setIsSettingsModalOpen(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Falha ao salvar configurações. Tente novamente.");
    }
  }, [isAuthenticated, activeDashboard]);
  
  const handleSaveGoal = useCallback(async (goal: Goal) => {
    if (!isAuthenticated || !activeDashboard) return;
    try {
        const goalToSave = goalToApi({ ...goal, dashboard_id: activeDashboard.id });
        let savedGoalRaw: any;
        const existingIndex = goals.findIndex(g => g.id === goal.id);
        if (existingIndex > -1) {
            savedGoalRaw = await apiClient.put(`/goals/${goal.id}`, goalToSave);
            setGoals(prevGoals => prevGoals.map(g => g.id === goal.id ? goalFromApi(savedGoalRaw) : g));
        } else {
            savedGoalRaw = await apiClient.post('/goals', goalToSave);
            setGoals(prevGoals => [...prevGoals, goalFromApi(savedGoalRaw)]);
        }
        setIsGoalModalOpen(false);
        setEditingGoal(null);
    } catch (error) {
        console.error("Error saving goal:", error);
        alert("Falha ao salvar meta. Tente novamente.");
    }
  }, [isAuthenticated, goals, activeDashboard]);

  const handleDeleteGoal = useCallback(async (goalId: string) => {
    if (!isAuthenticated || !activeDashboard) return;
    try {
        await apiClient.delete(`/goals/${goalId}?dashboardId=${activeDashboard.id}`);
        setGoals(prevGoals => prevGoals.filter(g => g.id !== goalId));
    } catch (error) {
        console.error("Error deleting goal:", error);
        alert("Falha ao excluir meta. Tente novamente.");
    }
  }, [isAuthenticated, activeDashboard]);


  const handleDayClick = useCallback((date: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth || initialBalance === null || !activeDashboard) return;
    setSelectedDateForEntry(date);
    setIsEntryModalOpen(true);
  }, [initialBalance, activeDashboard]);
  
  const getCurrentEntryDataForSelectedDate = (): DailyEntry | undefined => {
    if (selectedDateForEntry) {
      const dateKey = formatDateKey(selectedDateForEntry);
      return entries[dateKey];
    }
    return undefined;
  };

  const openGoalModalForEdit = (goal: Goal) => { setEditingGoal(goal); setIsGoalModalOpen(true); };
  const openGoalModalForNew = () => { setEditingGoal(null); setIsGoalModalOpen(true); };
  const handleShowDayDetails = useCallback((dayData: CalculatedDayData) => { setDetailedDayData(dayData); setIsDayDetailsModalOpen(true); }, []);
  const toggleView = () => { setCurrentView(prev => prev === 'calendar' ? 'reports' : 'calendar'); };
  
  const allUniqueTags = useMemo(() => {
    const tagSet = new Set<string>();
    Object.values(entries).forEach(entry => { entry.tags?.forEach(tag => tagSet.add(tag)); });
    return Array.from(tagSet).sort();
  }, [entries]);

  const handleBackendSetupSuccess = () => {
    setIsBackendSetupComplete(true);
    window.location.reload();
  };

  // Render logic based on setup and auth state
  if (isCheckingSetup || (isBackendSetupComplete === null)) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xl">Verificando configuração do backend...</div>;
  }

  if (!isBackendSetupComplete) {
    return <PostgresGetStartedScreen onSetupSuccess={handleBackendSetupSuccess} initialMessage={setupStatusMessage} />;
  }

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />; 
  }

  if (isLoadingDashboards || dashboards === null) {
     return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xl">Carregando dashboards...</div>;
  }

  if (!activeDashboard) {
    return <DashboardSelectionScreen 
              dashboards={dashboards} 
              onDashboardSelected={handleDashboardSelected} 
              onCreateDashboard={handleCreateDashboard}
              currentUserId={currentUser?.id} 
           />;
  }

  // Main app loading state after dashboard is selected
  if (isLoading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xl">Carregando dados do dashboard {activeDashboard.name}...</div>;
  }
  
  // Prompt for initial balance if not set for the active dashboard
  // AND the initial balance modal is not already open due to some other logic.
  if (initialBalance === null && !isInitialBalanceModalOpen && !isLoading) {
     return (
        <div className="flex items-center justify-center min-h-screen bg-slate-900">
            <InitialBalanceModal
                isOpen={true} // Force open if conditions met
                onClose={() => { 
                     // Only allow close if balance has been set, otherwise user is stuck.
                     if (initialBalance !== null) setIsInitialBalanceModalOpen(false); 
                     else alert("Por favor, defina um saldo inicial para este dashboard para continuar."); 
                }}
                onSubmit={(balance) => handleSetInitialBalance(balance, settings.currency)}
                currency={settings.currency}
            />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col p-2 sm:p-4 md:p-8 font-sans">
      <Header
        currentDate={currentDate}
        onPrevMonth={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
        onNextMonth={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
        onToday={() => setCurrentDate(new Date())}
        onToggleView={toggleView}
        currentView={currentView}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onLogout={handleLogout}
        isAuthenticated={isAuthenticated}
        activeDashboardName={activeDashboard?.name}
        dashboards={dashboards}
        onSelectDashboard={handleDashboardSelected}
      />
      {/* Only render content if initial balance is set or the modal is explicitly open for setting it */}
      {initialBalance !== null || isInitialBalanceModalOpen ? (
        currentView === 'calendar' ? (
          <CalendarGrid
            currentDate={currentDate}
            entries={entries}
            initialBalance={initialBalance ?? 0} // Provide 0 if null, though modal should prevent this view
            onDayClick={handleDayClick}
            getPreviousBalance={(dateKey, allEntries, ib) => getPreviousBalanceForDate(dateKey, allEntries, ib)}
            currency={settings.currency}
            goals={goals}
            onShowDetails={handleShowDayDetails}
          />
        ) : (
          <ReportsView 
            entries={entries} 
            initialBalance={initialBalance ?? 0} // Provide 0 if null
            currency={settings.currency}
            allTags={allUniqueTags}
          />
        )
      ) : (
         <div className="flex-grow flex items-center justify-center text-slate-500">
            Carregando ou aguardando definição do saldo inicial para o dashboard {activeDashboard.name}...
        </div>
      )}
      
      <InitialBalanceModal
        isOpen={isInitialBalanceModalOpen && initialBalance === null && isAuthenticated && !!activeDashboard}
        onClose={() => { 
            if (initialBalance !== null) setIsInitialBalanceModalOpen(false); 
            else alert("Por favor, defina um saldo inicial para este dashboard."); 
        }}
        onSubmit={(balance) => handleSetInitialBalance(balance, settings.currency)}
        currency={settings.currency}
      />
      {selectedDateForEntry && initialBalance !== null && activeDashboard && (
        <EntryModal
          isOpen={isEntryModalOpen}
          onClose={() => { setIsEntryModalOpen(false); setSelectedDateForEntry(null); }}
          onSubmit={handleEntryModalSubmit}
          selectedDate={selectedDateForEntry}
          initialBalance={initialBalance}
          entries={entries}
          currentEntryData={getCurrentEntryDataForSelectedDate()}
          currency={settings.currency}
        />
      )}
      {activeDashboard && (
        <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            currentSettings={settings}
            onSave={handleSaveSettings}
            onOpenGoalManager={() => { setIsSettingsModalOpen(false); setIsGoalModalOpen(true); }}
        />
      )}
      {activeDashboard && (
        <GoalModal
            isOpen={isGoalModalOpen}
            onClose={() => { setIsGoalModalOpen(false); setEditingGoal(null); }}
            onSave={handleSaveGoal}
            existingGoal={editingGoal}
            goals={goals}
            onDeleteGoal={handleDeleteGoal}
            onEditGoal={openGoalModalForEdit}
            onAddNewGoal={openGoalModalForNew}
            currency={settings.currency}
        />
      )}
      {detailedDayData && activeDashboard && (
        <DayDetailsModal
          isOpen={isDayDetailsModalOpen}
          onClose={() => setIsDayDetailsModalOpen(false)}
          dayData={detailedDayData}
          currency={settings.currency}
          onEditEntry={() => {
             setIsDayDetailsModalOpen(false);
             setTimeout(() => {
                if (detailedDayData) { 
                    handleDayClick(detailedDayData.date, detailedDayData.isCurrentMonth);
                }
             }, 50);
          }}
        />
      )}

       <footer className="text-center text-xs text-slate-600 mt-6 sm:mt-8">
        Dashboard Ativo: {activeDashboard?.name || 'Nenhum selecionado'}. Saldo Inicial: {initialBalance !== null ? formatCurrency(initialBalance, settings.currency) : 'Não definido'}
      </footer>
    </div>
  );
};

export default App;
