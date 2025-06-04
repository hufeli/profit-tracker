
import type { Entries, CurrencyCode } from '../types';
import { formatDateKey, formatCurrency, getPreviousBalanceForDate } from './dateUtils';

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('Este navegador não suporta notificações desktop.');
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

let lastNotificationDate: string | null = null;

export const scheduleNotificationCheck = (
  entries: Entries,
  notificationTime: string, // HH:MM
  currency: CurrencyCode,
  initialBalance: number
): number => { 
  
  const checkAndNotify = () => {
    if (Notification.permission !== 'granted') return;

    const now = new Date();
    const [hours, minutes] = notificationTime.split(':').map(Number);

    if (now.getHours() === hours && now.getMinutes() === minutes) {
      const todayKey = formatDateKey(now);
      
      // Prevent multiple notifications for the same minute on the same day
      if (lastNotificationDate === todayKey + notificationTime) return;

      if (!entries[todayKey]) {
        const previousBalance = getPreviousBalanceForDate(todayKey, entries, initialBalance);
        new Notification('Profit Tracker Lembrete', {
          body: `Não se esqueça de registrar seu saldo final de hoje! Saldo anterior: ${formatCurrency(previousBalance, currency)}.`,
          icon: '/icon-192.png', // Assumes you have an icon here
        });
        lastNotificationDate = todayKey + notificationTime;
      }
    }
  };

  // Check every minute
  const intervalId: number = window.setInterval(checkAndNotify, 60000); 
  // Initial check in case app is opened at the exact time
  checkAndNotify(); 
  return intervalId;
};