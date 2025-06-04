
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Entries, CurrencyCode, ReportSummaryStats, ProcessedReportData, ReportDateRange, ReportFilters, CustomDateRange } from '../types';
import { formatDateKey, MONTH_NAMES_PT, formatCurrency, DAYS_OF_WEEK_PT_FULL } from '../utils/dateUtils';
import { ProfitChart } from './ProfitChart';
import { FunnelIcon, ArrowsRightLeftIcon, ArrowDownTrayIcon, XMarkIcon, TagIcon } from './Icons';
import { exportData } from '../utils/exportUtils';

interface ReportsViewProps {
  entries: Entries;
  initialBalance: number;
  currency: CurrencyCode;
  allTags: string[]; // All unique tags available from entries
}

const baseFilterOptions: { label: string; value: ReportDateRange }[] = [
  { label: 'Este Mês', value: 'thisMonth' },
  { label: 'Últimos 30 dias', value: 'last30days' },
  { label: 'Últimos 90 dias', value: 'last90days' },
  { label: 'Este Ano', value: 'thisYear' },
  { label: 'Desde o Início', value: 'allTime' },
  // { label: 'Personalizado', value: 'custom' }, // TODO: Implement custom date picker
];


const processEntriesToReportData = (
    entries: Entries, 
    initialBalance: number, 
    range: ReportDateRange, 
    _customRange?: CustomDateRange, // Placeholder for custom range
    filterTags: string[] = []
): ProcessedReportData[] => {
    
    const data: ProcessedReportData[] = [];
    const sortedEntryKeys = Object.keys(entries)
        .filter(key => {
            if (filterTags.length === 0) return true;
            const entry = entries[key];
            return entry.tags && entry.tags.some(tag => filterTags.includes(tag));
        })
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    if (sortedEntryKeys.length === 0 && range !== 'allTime' && filterTags.length > 0) {
      // If filtering by tags and no entries match, return empty.
      // Or if not 'allTime' and no entries for other ranges.
      return [];
    }
    
    let startDate: Date;
    let endDate: Date = new Date();
    endDate.setHours(23, 59, 59, 999);
    const now = new Date();

    switch (range) {
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last30days':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 29);
        break;
      case 'last90days':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 89);
        break;
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case 'allTime':
      default:
        if (sortedEntryKeys.length > 0) {
          startDate = new Date(sortedEntryKeys[0]);
        } else {
          startDate = new Date(); 
        }
        if (sortedEntryKeys.length > 0) {
            const lastEntryDate = new Date(sortedEntryKeys[sortedEntryKeys.length -1]);
            if(lastEntryDate > endDate) endDate = lastEntryDate;
        }
        break;
    }
    startDate.setHours(0, 0, 0, 0);

    let runningBalanceBeforePeriod = initialBalance;
    // Adjust initial balance based on entries *before* the period, considering tag filters
    Object.keys(entries).sort().forEach(key => {
        if (new Date(key) < startDate) {
            // Only apply if not tag filtering OR if entry matches tag filter
             if (filterTags.length === 0 || (entries[key].tags && entries[key].tags.some(tag => filterTags.includes(tag)))) {
                runningBalanceBeforePeriod = entries[key].finalBalance;
            }
        }
    });
    
    let currentRunningBalance = runningBalanceBeforePeriod;
    let cumulativeProfitSincePeriodStart = 0; 

    if (range === 'allTime' && sortedEntryKeys.length === 0) {
        const todayKey = formatDateKey(new Date());
        const todayLabel = `${new Date().getDate()}/${new Date().getMonth() +1}`;
        data.push({
            date: todayKey, dayLabel: todayLabel, dailyProfit: 0,
            cumulativeProfit: 0, balance: initialBalance,
        });
        return data; // Return early if no entries and allTime
    }

    const loopEndDate = new Date(endDate);
    if (range === 'thisMonth' || range === 'thisYear') {
        if (loopEndDate > now) { // Cap end date at today for "This Month" and "This Year"
          loopEndDate.setTime(now.getTime());
          loopEndDate.setHours(23,59,59,999);
        }
    }
    
    for (let d = new Date(startDate); d <= loopEndDate; d.setDate(d.getDate() + 1)) {
      const dateKey = formatDateKey(d);
      const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
      const entry = entries[dateKey];
      let dailyProfit = 0;
      let useEntry = false;

      if (entry) {
          if (filterTags.length === 0 || (entry.tags && entry.tags.some(tag => filterTags.includes(tag)))) {
            useEntry = true;
          }
      }
      
      if (useEntry && entry) {
        dailyProfit = entry.finalBalance - currentRunningBalance;
        currentRunningBalance = entry.finalBalance;
      }
      // If no entry for the day, or entry filtered out, profit is 0, balance carries over
      
      cumulativeProfitSincePeriodStart += dailyProfit;
      data.push({ 
          date: dateKey, dayLabel, dailyProfit, 
          cumulativeProfit: cumulativeProfitSincePeriodStart, 
          balance: currentRunningBalance,
          tags: entry?.tags, // Carry over tags/notes if entry exists
          notes: entry?.notes
      });
    }
    
    if (range === 'allTime' && data.length > 0) {
        let lastDataDate = new Date(data[data.length - 1].date);
        lastDataDate.setHours(0,0,0,0);
        const todayDate = new Date();
        todayDate.setHours(0,0,0,0);

        while(lastDataDate < todayDate) {
            lastDataDate.setDate(lastDataDate.getDate() + 1);
            const nextDateKey = formatDateKey(lastDataDate);
            const nextDayLabel = `${lastDataDate.getDate()}/${lastDataDate.getMonth() + 1}`;
            data.push({
                date: nextDateKey, dayLabel: nextDayLabel, dailyProfit: 0,
                cumulativeProfit: data[data.length-1].cumulativeProfit,
                balance: data[data.length-1].balance
            });
        }
    }
    return data;
};

const calculateSummaryStats = (reportData: ProcessedReportData[], entriesForStats: Entries, initialBalanceForFactor: number): ReportSummaryStats => {
    const totalProfit = reportData.reduce((sum, item) => sum + item.dailyProfit, 0);
    
    const actualTradingDaysData = reportData.filter(item => entriesForStats[item.date] !== undefined && (item.tags === undefined || item.tags.length === 0 || (entriesForStats[item.date].tags && entriesForStats[item.date].tags.some(t => item.tags!.includes(t)) ) ) );

    const positiveDays = actualTradingDaysData.filter(item => item.dailyProfit > 0).length;
    const negativeDays = actualTradingDaysData.filter(item => item.dailyProfit < 0).length;
    const neutralDays = actualTradingDaysData.filter(item => item.dailyProfit === 0).length;
    const tradingDays = actualTradingDaysData.length;
    
    const averageDailyProfit = tradingDays > 0 ? totalProfit / tradingDays : 0;

    const sumOfPositiveProfits = actualTradingDaysData.filter(d => d.dailyProfit > 0).reduce((sum, d) => sum + d.dailyProfit, 0);
    const sumOfNegativeProfits = actualTradingDaysData.filter(d => d.dailyProfit < 0).reduce((sum, d) => sum + d.dailyProfit, 0);

    const winLossRatio = (positiveDays + negativeDays) > 0 ? positiveDays / (positiveDays + negativeDays) * 100 : undefined;
    const avgGainPositiveDay = positiveDays > 0 ? sumOfPositiveProfits / positiveDays : undefined;
    const avgLossNegativeDay = negativeDays > 0 ? sumOfNegativeProfits / negativeDays : undefined; // Will be negative
    
    let maxProfitDay: ReportSummaryStats['maxProfitDay'] = undefined;
    let maxLossDay: ReportSummaryStats['maxLossDay'] = undefined;

    actualTradingDaysData.forEach(d => {
        if (d.dailyProfit > 0 && (!maxProfitDay || d.dailyProfit > maxProfitDay.amount)) {
            maxProfitDay = { date: d.date, amount: d.dailyProfit };
        }
        if (d.dailyProfit < 0 && (!maxLossDay || d.dailyProfit < maxLossDay.amount)) {
            maxLossDay = { date: d.date, amount: d.dailyProfit };
        }
    });

    const profitFactor = sumOfNegativeProfits !== 0 ? Math.abs(sumOfPositiveProfits / sumOfNegativeProfits) : undefined;

    const performanceByDayOfWeek = DAYS_OF_WEEK_PT_FULL.map((dayName, index) => {
        const profitForDay = actualTradingDaysData
            .filter(d => new Date(d.date).getDay() === index)
            .reduce((sum, d) => sum + d.dailyProfit, 0);
        return { day: dayName, profit: profitForDay };
    });

    return {
      totalProfit, averageDailyProfit, positiveDays, negativeDays, neutralDays, tradingDays,
      winLossRatio, avgGainPositiveDay, avgLossNegativeDay, maxProfitDay, maxLossDay, profitFactor, performanceByDayOfWeek
    };
};


export const ReportsView: React.FC<ReportsViewProps> = ({ entries, initialBalance, currency, allTags }) => {
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: 'thisMonth',
    tags: [],
  });
  const [showTagFilterModal, setShowTagFilterModal] = useState(false);
  const [tempSelectedTags, setTempSelectedTags] = useState<string[]>([]);
  
  useEffect(() => {
      setTempSelectedTags(filters.tags); // Sync temp tags when modal opens or filters change
  }, [filters.tags, showTagFilterModal]);


  const handleApplyTagFilter = () => {
      setFilters(prev => ({ ...prev, tags: tempSelectedTags }));
      setShowTagFilterModal(false);
  };

  const toggleTagInTemp = (tag: string) => {
    setTempSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };


  const reportData = useMemo(
    () => processEntriesToReportData(entries, initialBalance, filters.dateRange, undefined, filters.tags),
    [entries, initialBalance, filters]
  );
  
  const compareReportData = useMemo(
    () => filters.compareDateRange 
        ? processEntriesToReportData(entries, initialBalance, filters.compareDateRange, undefined, filters.tags) 
        : null,
    [entries, initialBalance, filters]
  );

  const summaryStats = useMemo(
      () => calculateSummaryStats(reportData, entries, initialBalance), 
      [reportData, entries, initialBalance]
  );
  const compareSummaryStats = useMemo(
      () => compareReportData ? calculateSummaryStats(compareReportData, entries, initialBalance) : null, 
      [compareReportData, entries, initialBalance]
  );

  const chartData = useMemo(() => ({
    labels: reportData.map(d => d.dayLabel),
    datasets: [
      {
        label: `Lucro Diário (${currency})`,
        data: reportData.map(d => d.dailyProfit),
        borderColor: 'rgb(52, 211, 153)', yAxisID: 'y', tension: 0.1, fill: true,
        backgroundColor: 'rgba(52, 211, 153, 0.1)',
      },
      {
        label: `Saldo Acumulado (${currency})`,
        data: reportData.map(d => d.balance),
        borderColor: 'rgb(59, 130, 246)', yAxisID: 'y1', tension: 0.1, fill: false,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
      },
      ...(compareReportData ? [{
        label: `Comparativo Saldo (${currency})`,
        data: compareReportData.map(d => d.balance),
        borderColor: 'rgb(234, 179, 8)', // amber-500
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        yAxisID: 'y1', tension: 0.1, fill: false, borderDash: [5, 5]
      }] : [])
    ]
  }), [reportData, compareReportData, currency]);
  
  const chartOptions = useMemo(() => ({ /* Existing options structure, adapt if needed */
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      tooltip: {
        backgroundColor: '#334155', titleColor: '#e2e8f0', bodyColor: '#e2e8f0',
        borderColor: '#475569', borderWidth: 1,
        callbacks: {
            label: function(context: any) {
                let label = context.dataset.label || '';
                if (label) { label += ': '; }
                if (context.parsed.y !== null) {
                    label += formatCurrency(context.parsed.y, currency);
                }
                return label;
            }
        }
      },
      legend: { labels: { color: '#94a3b8' } }
    },
    scales: { /* existing scales structure */
        x: { ticks: { color: '#94a3b8', maxRotation: 45, minRotation: 45 }, grid: { color: '#334155' } },
        y: { type: 'linear' as const, display: true, position: 'left' as const, 
             ticks: { color: 'rgb(52, 211, 153)', callback: (v:any) => formatCurrency(Number(v), currency, 'pt-BR').replace(/\s\S*$/, '') }, // Compact-like
             grid: { color: '#334155' }, title: { display: true, text: `Lucro Diário (${currency})`, color: 'rgb(52, 211, 153)'} },
        y1: { type: 'linear' as const, display: true, position: 'right' as const,
              ticks: { color: 'rgb(59, 130, 246)', callback: (v:any) => formatCurrency(Number(v), currency, 'pt-BR').replace(/\s\S*$/, '') }, // Compact-like
              grid: { drawOnChartArea: false }, title: { display: true, text: `Saldo Acumulado (${currency})`, color: 'rgb(59, 130, 246)'} }
    }
  }), [currency]);

  const handleExport = (format: 'csv' | 'json') => {
    exportData(entries, initialBalance, currency, format);
  };
  
  const StatCard: React.FC<{title: string; value?: string | number; currencyValue?: number; comparisonValue?: string | number; comparisonCurrencyValue?: number; positiveGood?: boolean; className?: string; isPercentage?: boolean; isRatio?: boolean}> = 
    ({title, value, currencyValue, comparisonValue, comparisonCurrencyValue, positiveGood = true, className, isPercentage, isRatio}) => {
    
    const mainDisplayValue = currencyValue !== undefined ? formatCurrency(currencyValue, currency) : 
                             isPercentage && typeof value === 'number' ? `${value.toFixed(1)}%` :
                             isRatio && typeof value === 'number' ? value.toFixed(2) :
                             value;
    
    const compDisplayValue = comparisonCurrencyValue !== undefined ? formatCurrency(comparisonCurrencyValue, currency) :
                              isPercentage && typeof comparisonValue === 'number' ? `${comparisonValue.toFixed(1)}%` :
                              isRatio && typeof comparisonValue === 'number' ? comparisonValue.toFixed(2) :
                              comparisonValue;

    let valueColor = 'text-slate-300';
    if (typeof value === 'number') {
        if (value > 0) valueColor = positiveGood ? 'text-emerald-400' : 'text-red-400';
        else if (value < 0) valueColor = positiveGood ? 'text-red-400' : 'text-emerald-400';
    } else if (currencyValue !== undefined) {
        if (currencyValue > 0) valueColor = positiveGood ? 'text-emerald-400' : 'text-red-400';
        else if (currencyValue < 0) valueColor = positiveGood ? 'text-red-400' : 'text-emerald-400';
    }


    return (
      <div className={`bg-slate-700 p-3 rounded-md ${className}`}>
        <p className="text-xs text-slate-400 mb-0.5 truncate" title={title}>{title}</p>
        <p className={`text-lg font-bold ${valueColor}`}>{mainDisplayValue ?? '-'}</p>
        {compDisplayValue !== undefined && <p className="text-xs text-slate-500 mt-0.5">Comp: {compDisplayValue ?? '-'}</p>}
      </div>
    );
  };

  return (
    <div className="bg-slate-800 p-4 sm:p-6 rounded-lg shadow-lg space-y-8">
      {/* Filters Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <h3 className="text-base font-semibold text-white mb-2">Filtrar Período Principal</h3>
          <div className="flex flex-wrap gap-2">
            {baseFilterOptions.map(opt => (
              <button key={opt.value} onClick={() => setFilters(f => ({...f, dateRange: opt.value}))}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${filters.dateRange === opt.value ? 'bg-sky-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
            <h3 className="text-base font-semibold text-white mb-2 flex items-center">
                <ArrowsRightLeftIcon className="w-4 h-4 mr-1.5 text-slate-400"/>Período de Comparação
                {filters.compareDateRange && (
                    <button onClick={() => setFilters(f => ({...f, compareDateRange: null}))} className="ml-auto p-1 text-slate-400 hover:text-red-400">
                        <XMarkIcon className="w-4 h-4"/>
                    </button>
                )}
            </h3>
            <div className="flex flex-wrap gap-2">
            {baseFilterOptions.filter(o => o.value !== filters.dateRange).map(opt => ( // Exclude current main range
              <button key={`comp-${opt.value}`} onClick={() => setFilters(f => ({...f, compareDateRange: opt.value}))}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${filters.compareDateRange === opt.value ? 'bg-amber-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
         <div>
          <h3 className="text-base font-semibold text-white mb-2 flex items-center">
              <FunnelIcon className="w-4 h-4 mr-1.5 text-slate-400"/>Filtrar por Tags
              {filters.tags.length > 0 && (
                  <button onClick={() => {setFilters(f => ({...f, tags: []})); setTempSelectedTags([]);}} className="ml-auto text-xs text-red-400 hover:text-red-300">Limpar ({filters.tags.length})</button>
              )}
          </h3>
          <button 
            onClick={() => setShowTagFilterModal(true)}
            className="w-full px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md flex items-center justify-center"
          >
            <TagIcon className="w-4 h-4 mr-2"/>
            {filters.tags.length > 0 ? `Tags Selecionadas: ${filters.tags.length}` : "Selecionar Tags"}
          </button>
        </div>
      </div>

      {/* Tag Filter Modal */}
      {showTagFilterModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Selecionar Tags para Filtrar</h3>
              <button onClick={() => setShowTagFilterModal(false)} className="p-1 text-slate-400 hover:text-white"><XMarkIcon className="w-5 h-5"/></button>
            </div>
            {allTags.length === 0 && <p className="text-slate-400 text-sm">Nenhuma tag encontrada nas suas entradas.</p>}
            <div className="max-h-60 overflow-y-auto space-y-2 mb-4 pr-2">
              {allTags.map(tag => (
                <label key={tag} className="flex items-center space-x-2 p-2 rounded hover:bg-slate-700 cursor-pointer">
                  <input type="checkbox" 
                    checked={tempSelectedTags.includes(tag)} 
                    onChange={() => toggleTagInTemp(tag)}
                    className="form-checkbox h-4 w-4 text-sky-500 bg-slate-600 border-slate-500 rounded focus:ring-sky-500"
                  />
                  <span className="text-slate-300">{tag}</span>
                </label>
              ))}
            </div>
            <button onClick={handleApplyTagFilter} className="w-full bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 rounded-md">Aplicar Filtro de Tags</button>
          </div>
        </div>
      )}

      {reportData.length > 0 ? (
        <>
          <div className="h-72 md:h-96">
            <ProfitChart data={chartData} options={chartOptions} />
          </div>

          {/* Summary Stats Section */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Resumo do Período {filters.tags.length > 0 ? `(Tags: ${filters.tags.join(', ')})` : ''}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 text-center">
                <StatCard title="Lucro Total" currencyValue={summaryStats.totalProfit} comparisonCurrencyValue={compareSummaryStats?.totalProfit} />
                <StatCard title="Média Lucro/Dia Operado" currencyValue={summaryStats.averageDailyProfit} comparisonCurrencyValue={compareSummaryStats?.averageDailyProfit} />
                <StatCard title="Dias Positivos" value={summaryStats.positiveDays} comparisonValue={compareSummaryStats?.positiveDays} />
                <StatCard title="Dias Negativos" value={summaryStats.negativeDays} comparisonValue={compareSummaryStats?.negativeDays} positiveGood={false} />
                <StatCard title="Dias Neutros (c/ Reg.)" value={summaryStats.neutralDays} comparisonValue={compareSummaryStats?.neutralDays} />
                <StatCard title="Taxa de Acerto" value={summaryStats.winLossRatio} comparisonValue={compareSummaryStats?.winLossRatio} isPercentage />
                <StatCard title="Fator de Lucro" value={summaryStats.profitFactor} comparisonValue={compareSummaryStats?.profitFactor} isRatio />
                <StatCard title="Média Ganho (Dia +)" currencyValue={summaryStats.avgGainPositiveDay} comparisonCurrencyValue={compareSummaryStats?.avgGainPositiveDay} />
                <StatCard title="Média Perda (Dia -)" currencyValue={summaryStats.avgLossNegativeDay} comparisonCurrencyValue={compareSummaryStats?.avgLossNegativeDay} positiveGood={false} />
                <StatCard title="Maior Lucro (Dia)" currencyValue={summaryStats.maxProfitDay?.amount} comparisonCurrencyValue={compareSummaryStats?.maxProfitDay?.amount} />
                <StatCard title="Maior Prejuízo (Dia)" currencyValue={summaryStats.maxLossDay?.amount} comparisonCurrencyValue={compareSummaryStats?.maxLossDay?.amount} positiveGood={false} />
            </div>
             <p className="text-xs text-slate-500 mt-3 text-center sm:text-right">
                Dias com registros no período principal: {summaryStats.tradingDays}
                {compareSummaryStats && ` (Comparativo: ${compareSummaryStats.tradingDays})`}
            </p>
          </div>

          {/* Performance by Day of Week */}
          {summaryStats.performanceByDayOfWeek && (
            <div>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Desempenho por Dia da Semana</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3">
                    {summaryStats.performanceByDayOfWeek.map(item => (
                        <StatCard 
                            key={item.day} 
                            title={item.day} 
                            currencyValue={item.profit} 
                            className="text-center" 
                        />
                    ))}
                </div>
            </div>
          )}
          
           {/* Export Section */}
          <div className="mt-8 pt-6 border-t border-slate-700/50">
            <h3 className="text-lg font-semibold text-white mb-3">Exportar Dados</h3>
            <div className="flex space-x-3">
                <button onClick={() => handleExport('csv')} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-md text-sm flex items-center">
                    <ArrowDownTrayIcon className="w-4 h-4 mr-2"/> Exportar para CSV
                </button>
                <button onClick={() => handleExport('json')} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-md text-sm flex items-center">
                    <ArrowDownTrayIcon className="w-4 h-4 mr-2"/> Exportar para JSON
                </button>
            </div>
          </div>

        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-slate-500 text-lg">Não há dados suficientes para exibir o relatório para esta combinação de filtros e período.</p>
          <p className="text-slate-600 text-sm mt-2">Tente selecionar um período diferente ou ajustar os filtros de tags.</p>
        </div>
      )}
    </div>
  );
};

