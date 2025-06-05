
import React, { useMemo } from 'react';
import type { CalculatedDayData, CurrencyCode } from '../types';
import { formatCurrency } from '../utils/dateUtils';
import { TagIcon, ChatBubbleLeftEllipsisIcon, InformationCircleIcon } from './Icons'; // Added InformationCircleIcon

interface DayTileProps {
  dayData: CalculatedDayData;
  onClick: () => void;
  currency: CurrencyCode;
  onShowDetails: (dayData: CalculatedDayData) => void; // New prop for showing details
}

export const DayTile: React.FC<DayTileProps> = ({ dayData, onClick, currency, onShowDetails }) => {
  const { date, dayNumber, profit, entryExists, isCurrentMonth, isToday, tags, notes, goalProgress, dynamicDailyTargetForWeek, dynamicDailyTargetForMonth } = dayData;

  const { tileClasses, textColor, profitColor } = useMemo(() => {
    let classes = "h-28 sm:h-32 md:h-36 flex flex-col p-1.5 sm:p-2 text-left relative transition-all duration-150 ease-in-out group ";
    let txtColor = isCurrentMonth ? 'text-slate-200' : 'text-slate-600';
    let pColor = '';

    if (isCurrentMonth) {
      classes += " bg-slate-800 hover:bg-slate-700 cursor-pointer ";
      if (entryExists) {
        if (profit !== undefined) {
          if (profit > 0) {
            classes +=
              " bg-emerald-700 bg-opacity-70 hover:bg-emerald-600 hover:bg-opacity-70 ";
            pColor = 'text-emerald-300';
            txtColor = 'text-white';
          } else if (profit < 0) {
            classes +=
              " bg-red-700 bg-opacity-70 hover:bg-red-600 hover:bg-opacity-70 ";
            pColor = 'text-red-300';
            txtColor = 'text-white';
          } else {
            // profit === 0
            classes +=
              " bg-slate-700 bg-opacity-80 hover:bg-slate-600 hover:bg-opacity-80 ";
            pColor = 'text-slate-400';
            txtColor = 'text-slate-300';
          }
        }
      } else {
        classes += " bg-slate-800 border border-slate-700 border-opacity-50 ";
      }
    } else {
      classes += " bg-slate-850 opacity-80 border border-slate-700 border-opacity-30 ";
      txtColor = 'text-slate-600';
    }

    if (isToday && isCurrentMonth) {
      classes += " border-2 border-sky-500 ";
    }

    return { tileClasses: classes, textColor: txtColor, profitColor: pColor };
  }, [isCurrentMonth, entryExists, profit, isToday]);

  const hasDetails = isCurrentMonth && ((tags && tags.length > 0) || (notes && notes.length > 0));

  return (
    <div className={tileClasses} onClick={isCurrentMonth ? onClick : undefined}>
      <div className="flex justify-between items-start w-full"> {/* items-start to allow dynamic target text to push content down */}
        <span className={`text-xs sm:text-sm font-medium ${textColor} ${isToday && isCurrentMonth ? 'bg-sky-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center' : ''}`}>
          {dayNumber}
        </span>
        {hasDetails && (
           <button
            onClick={(e) => { e.stopPropagation(); onShowDetails(dayData);}}
            className="p-0.5 rounded hover:bg-slate-500 hover:bg-opacity-30 focus:outline-none focus:ring-1 focus:ring-sky-400"
            aria-label="Ver detalhes do dia"
            >
             <InformationCircleIcon className={`w-4 h-4 ${isCurrentMonth ? 'text-slate-400' : 'text-slate-600'} group-hover:text-sky-300`} />
           </button>
        )}
      </div>
      
      <div className="flex-grow flex flex-col items-center justify-center text-center relative"> {/* Added relative for positioning dynamic target */}
        {isCurrentMonth && entryExists && profit !== undefined && (
            <p className={`text-base sm:text-lg md:text-xl font-bold ${profitColor !== '' ? profitColor : textColor}`}>
              {formatCurrency(profit, currency)}
            </p>
        )}

        {isCurrentMonth && !entryExists && (dynamicDailyTargetForWeek !== null || dynamicDailyTargetForMonth !== null) && (
             <div className="absolute bottom-0 left-0 right-0 px-0.5 pb-0.5">
                {dynamicDailyTargetForWeek !== null && dynamicDailyTargetForWeek > 0 && (
                    <p className="text-[9px] sm:text-[10px] text-sky-400 text-opacity-80 truncate" title={`Alvo dinâmico para a semana: ${formatCurrency(dynamicDailyTargetForWeek, currency)}/dia`}>
                        Sem: {formatCurrency(dynamicDailyTargetForWeek, currency)}
                    </p>
                )}
                {dynamicDailyTargetForMonth !== null && dynamicDailyTargetForMonth > 0 && (
                    <p className="text-[9px] sm:text-[10px] text-indigo-400 text-opacity-80 truncate" title={`Alvo dinâmico para o mês: ${formatCurrency(dynamicDailyTargetForMonth, currency)}/dia`}>
                        Mês: {formatCurrency(dynamicDailyTargetForMonth, currency)}
                    </p>
                )}
            </div>
        )}
      </div>


      {isCurrentMonth && entryExists && (dynamicDailyTargetForWeek !== null || dynamicDailyTargetForMonth !== null) && (
        <div className="text-center mt-0.5 leading-tight">
            {dynamicDailyTargetForWeek !== null && dynamicDailyTargetForWeek > 0 && (
                <p className="text-[9px] sm:text-[10px] text-sky-300 text-opacity-70 group-hover:text-sky-200 truncate" title={`Alvo dinâmico para a semana: ${formatCurrency(dynamicDailyTargetForWeek, currency)}/dia`}>
                    Alvo Sem: {formatCurrency(dynamicDailyTargetForWeek, currency)}
                </p>
            )}
            {dynamicDailyTargetForMonth !== null && dynamicDailyTargetForMonth > 0 && (
                <p className="text-[9px] sm:text-[10px] text-indigo-300 text-opacity-70 group-hover:text-indigo-200 truncate" title={`Alvo dinâmico para o mês: ${formatCurrency(dynamicDailyTargetForMonth, currency)}/dia`}>
                    Alvo Mês: {formatCurrency(dynamicDailyTargetForMonth, currency)}
                </p>
            )}
        </div>
      )}
      
      {isCurrentMonth && goalProgress && (
         <div className="w-full bg-slate-600 bg-opacity-50 rounded-full h-1.5 mt-auto mb-0.5">
            <div 
                className={`h-1.5 rounded-full ${goalProgress.percentage >= 100 ? 'bg-green-500' : 'bg-sky-500'}`}
                style={{ width: `${Math.min(goalProgress.percentage, 100)}%` }}
                title={`Meta Diária: ${formatCurrency(goalProgress.goal, currency)} (${goalProgress.percentage.toFixed(0)}%)`}
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