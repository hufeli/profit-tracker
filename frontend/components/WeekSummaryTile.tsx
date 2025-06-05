
import React from 'react';
import type { CalculatedWeekSummaryData, CurrencyCode } from '../types';
import { formatCurrency } from '../utils/dateUtils';

interface WeekSummaryTileProps {
  date: Date; // The Saturday this tile represents
  isCurrentMonth: boolean; // Is this Saturday part of the current month view?
  summaryData?: CalculatedWeekSummaryData;
  onClick: () => void; 
  currency: CurrencyCode;
}

let weekCounter = 0; 
let currentMonthForCounter = -1;


export const WeekSummaryTile: React.FC<WeekSummaryTileProps> = ({ date, isCurrentMonth, summaryData, onClick, currency }) => {
  
  // Simplified week counter based on date of Saturday
  const dayOfMonth = date.getDate();
  if (date.getMonth() !== currentMonthForCounter) {
    currentMonthForCounter = date.getMonth();
    // This logic might need adjustment if month starts mid-week and Saturday is from prev month
    if (dayOfMonth <= 7 && date.getDay() === 6) weekCounter = 1;
    else if (dayOfMonth <= 14 && date.getDay() === 6) weekCounter = 2;
    else if (dayOfMonth <= 21 && date.getDay() === 6) weekCounter = 3;
    else if (dayOfMonth <= 28 && date.getDay() === 6) weekCounter = 4;
    else if (date.getDay() === 6) weekCounter = 5; // For months with 5 Saturdays
  } else {
     if (dayOfMonth <= 7) weekCounter = 1;
     else if (dayOfMonth <= 14) weekCounter = 2;
     else if (dayOfMonth <= 21) weekCounter = 3;
     else if (dayOfMonth <= 28) weekCounter = 4;
     else weekCounter = 5;
  }


  let tileClasses = "h-28 sm:h-32 md:h-36 flex flex-col p-1.5 sm:p-2 text-left relative transition-all duration-150 ease-in-out ";
  const textColor = isCurrentMonth ? 'text-slate-300' : 'text-slate-600';

  if (isCurrentMonth) {
    tileClasses += " bg-slate-800 hover:bg-slate-700 border border-slate-700 border-opacity-50 ";
    if (summaryData && summaryData.entryCount > 0) {
      tileClasses += " bg-slate-750 bg-opacity-80 ";
    }
  } else {
    tileClasses += " bg-slate-850 opacity-80 border border-slate-700 border-opacity-30 ";
  }

  const isToday = new Date().toDateString() === date.toDateString();
   if (isToday && isCurrentMonth) {
     tileClasses += " border-2 border-sky-500 ";
  }


  return (
    <div className={tileClasses} onClick={isCurrentMonth ? onClick : undefined} role="button" tabIndex={isCurrentMonth ? 0 : -1}>
      <div className="flex justify-start items-center w-full">
         <span className={`text-xs sm:text-sm font-medium ${textColor} ${isToday && isCurrentMonth ? 'bg-sky-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center' : ''}`}>
          {date.getDate()}
        </span>
      </div>

      {isCurrentMonth && summaryData && summaryData.entryCount > 0 && (
        <div className="mt-1 sm:mt-2 flex-grow flex flex-col items-center justify-center text-center">
          <p className={`text-[10px] sm:text-xs font-semibold ${textColor} mb-0.5 sm:mb-1`}>
            Semana {weekCounter}
          </p>
          <p className={`text-base sm:text-lg font-bold ${summaryData.totalProfit > 0 ? 'text-emerald-400' : summaryData.totalProfit < 0 ? 'text-red-400' : textColor}`}>
            {formatCurrency(summaryData.totalProfit, currency)}
          </p>
          <p className={`text-[10px] sm:text-xs ${textColor} opacity-80`}>
            {summaryData.entryCount} {summaryData.entryCount === 1 ? 'registro' : 'registros'}
          </p>
        </div>
      )}
      {isCurrentMonth && (!summaryData || summaryData.entryCount === 0) && (
         <div className="flex-grow flex flex-col items-center justify-center text-center">
            <p className={`text-[10px] sm:text-xs font-semibold ${textColor} mb-0.5 sm:mb-1`}>
                Semana {weekCounter}
            </p>
            <span className="text-slate-600 text-xs"></span>
         </div>
      )}
      {isCurrentMonth && summaryData?.goalProgress && (
         <div className="w-full bg-slate-600 bg-opacity-50 rounded-full h-1.5 mt-auto mb-0.5">
            <div 
                className={`h-1.5 rounded-full ${summaryData.goalProgress.percentage >= 100 ? 'bg-green-500' : 'bg-sky-500'}`}
                style={{ width: `${Math.min(summaryData.goalProgress.percentage, 100)}%` }}
                title={`Meta Semanal: ${formatCurrency(summaryData.goalProgress.goal, currency)} (${summaryData.goalProgress.percentage.toFixed(0)}%)`}
            ></div>
        </div>
      )}
       {!isCurrentMonth && (
         <div className="flex-grow flex items-center justify-center">
            <span className="text-slate-700 text-xs"></span>
         </div>
       )}
    </div>
  );
};
