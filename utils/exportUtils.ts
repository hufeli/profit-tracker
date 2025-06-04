
import type { Entries, CurrencyCode, DailyEntry } from '../types';
import { formatDateKey, getPreviousBalanceForDate, formatCurrency } from './dateUtils';

const convertToCSV = (data: any[]): string => {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => JSON.stringify(row[header] ?? '', (_, value) => value ?? '')).join(',')
    )
  ];
  return csvRows.join('\n');
};

export const exportData = (
  entries: Entries,
  initialBalance: number,
  currency: CurrencyCode,
  format: 'csv' | 'json'
) => {
  const processedEntries = Object.keys(entries)
    .sort((a,b) => new Date(a).getTime() - new Date(b).getTime())
    .map(dateKey => {
      const entry = entries[dateKey];
      const previousBalance = getPreviousBalanceForDate(dateKey, entries, initialBalance);
      const profit = entry.finalBalance - previousBalance;
      return {
        Data: dateKey,
        'Saldo Final': entry.finalBalance,
        'Saldo Final Formatado': formatCurrency(entry.finalBalance, currency),
        'Lucro/Prejuízo': profit,
        'Lucro/Prejuízo Formatado': formatCurrency(profit, currency),
        Tags: (entry.tags || []).join('; '), // Use semicolon for CSV tags to avoid comma issues
        Anotações: entry.notes || '',
      };
    });
  
  const dataToExport = [
      { Data: "SALDO_INICIAL", 'Saldo Final': initialBalance, 'Saldo Final Formatado': formatCurrency(initialBalance, currency), 'Lucro/Prejuízo': 0, 'Lucro/Prejuízo Formatado': formatCurrency(0, currency), Tags: '', Anotações: 'Saldo Inicial Configurado'},
      ...processedEntries
  ];

  let fileContent: string;
  let mimeType: string;
  let fileExtension: string;

  if (format === 'csv') {
    fileContent = convertToCSV(dataToExport);
    mimeType = 'text/csv';
    fileExtension = 'csv';
  } else {
    fileContent = JSON.stringify(dataToExport, null, 2);
    mimeType = 'application/json';
    fileExtension = 'json';
  }

  const blob = new Blob([fileContent], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `profit_tracker_export_${formatDateKey(new Date())}.${fileExtension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};
