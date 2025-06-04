
import type { Entries, CurrencyCode } from '../types';

export const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDaysInMonth = (year: number, month: number): Date[] => {
  const date = new Date(year, month, 1);
  const days: Date[] = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

export const getPreviousBalanceForDate = (dateKey: string, entries: Entries, initialBalance: number): number => {
  const entryDates = Object.keys(entries).sort();
  
  const sortedEntryDatesBeforeCurrent = entryDates.filter(d => d < dateKey).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());

  if (sortedEntryDatesBeforeCurrent.length > 0) {
    return entries[sortedEntryDatesBeforeCurrent[0]].finalBalance;
  }

  return initialBalance;
};

export const MONTH_NAMES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export const DAYS_OF_WEEK_PT_SHORT = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
];
export const DAYS_OF_WEEK_PT_FULL = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];


export const getWeekNumberISO = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
}

export const getWeekId = (date: Date): string => {
    const year = date.getFullYear();
    const weekNumber = getWeekNumberISO(date);
    return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
};

export const getMonthId = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
};


export const formatCurrency = (value: number, currency: CurrencyCode = 'BRL', locale: string = 'pt-BR'): string => {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
};
