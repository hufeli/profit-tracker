
import React from 'react';
import type { Entries, CalculatedDayData, CalculatedWeekSummaryData, Goal, CurrencyCode } from '../types';
import { formatDateKey, DAYS_OF_WEEK_PT_SHORT, getWeekId, getMonthId, formatCurrency } from '../utils/dateUtils';
import { DayTile } from './DayTile';
import { WeekSummaryTile } from './WeekSummaryTile';
import { DayDetailsModal } from './DayDetailsModal'; // New import
import { calculateDynamicDailyTarget } from '../utils/goalUtils'; // Import the new utility

interface CalendarGridProps {
  currentDate: Date;
  entries: Entries;
  initialBalance: number;
  onDayClick: (date: Date, isCurrentMonth: boolean) => void;
  getPreviousBalance: (dateKey: string, entries: Entries, initialBalance: number) => number;
  currency: CurrencyCode;
  goals: Goal[];
  onShowDetails: (dayData: CalculatedDayData) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentDate,
  entries,
  initialBalance,
  onDayClick,
  getPreviousBalance,
  currency,
  goals, // This prop is used as allGoals for calculateDynamicDailyTarget
  onShowDetails,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const today = new Date();
  today.setHours(0, 0, 0, 0); 

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const calendarDays: CalculatedDayData[] = [];
  const weekSummaries: Record<string, CalculatedWeekSummaryData> = {};

  // Find relevant monthly goal
  const currentMonthId = getMonthId(currentDate);
  const monthlyGoal = goals.find(g => g.type === 'monthly' && g.appliesTo === currentMonthId);
  let accumulatedMonthProfitForGoal = 0;

  // Previous month's days
  const firstDayOfMonthWeekday = firstDayOfMonth.getDay(); 
  for (let i = 0; i < firstDayOfMonthWeekday; i++) {
    const date = new Date(year, month, i - firstDayOfMonthWeekday + 1);
    calendarDays.push({
      date,
      dayNumber: date.getDate(),
      isCurrentMonth: false,
      isToday: formatDateKey(date) === formatDateKey(today),
      entryExists: false,
    });
  }

  // Current month's days
  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    const date = new Date(year, month, day);
    const dateKey = formatDateKey(date);
    const entry = entries[dateKey];
    let profit: number | undefined;
    let goalProgress: CalculatedDayData['goalProgress'] | undefined;
    let dynamicDailyTargetForWeek: number | null = null;
    let dynamicDailyTargetForMonth: number | null = null;

    if (entry) {
      const prevBalance = getPreviousBalance(dateKey, entries, initialBalance);
      profit = entry.finalBalance - prevBalance;
      accumulatedMonthProfitForGoal += profit;

      const dailyGoal = goals.find(g => g.type === 'daily' && g.appliesTo === dateKey);
      if (dailyGoal && profit !== undefined) {
        goalProgress = {
          current: profit,
          goal: dailyGoal.amount,
          percentage: (profit / dailyGoal.amount) * 100,
        };
      }
    }
    
    // Calculate dynamic daily targets if no explicit daily goal for this day
    const explicitDailyGoalExists = goals.some(g => g.type === 'daily' && g.appliesTo === dateKey);
    if (!explicitDailyGoalExists && date <= today) { // Only calculate for past/today, not future
      const activeWeeklyGoal = goals.find(g => g.type === 'weekly' && getWeekId(date) === g.appliesTo);
      if (activeWeeklyGoal) {
        dynamicDailyTargetForWeek = calculateDynamicDailyTarget(activeWeeklyGoal, entries, initialBalance, date, goals);
      }

      const activeMonthlyGoal = goals.find(g => g.type === 'monthly' && getMonthId(date) === g.appliesTo);
      if (activeMonthlyGoal) {
        dynamicDailyTargetForMonth = calculateDynamicDailyTarget(activeMonthlyGoal, entries, initialBalance, date, goals);
      }
    }
    
    calendarDays.push({
      date,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: formatDateKey(date) === formatDateKey(today),
      entryExists: !!entry,
      profit,
      tags: entry?.tags,
      notes: entry?.notes,
      goalProgress,
      dynamicDailyTargetForWeek,
      dynamicDailyTargetForMonth,
    });
  }

  // Next month's days
  const totalCells = calendarDays.length > 35 ? 42 : 35; 
  for (let i = 1; calendarDays.length < totalCells; i++) {
    const date = new Date(year, month + 1, i);
     calendarDays.push({
      date,
      dayNumber: date.getDate(),
      isCurrentMonth: false,
      isToday: formatDateKey(date) === formatDateKey(today),
      entryExists: false,
    });
  }

  // Calculate weekly summaries and weekly goal progress
  calendarDays.forEach(dayData => {
    if (dayData.isCurrentMonth && dayData.entryExists && dayData.profit !== undefined) {
      const endOfWeek = new Date(dayData.date);
      endOfWeek.setDate(dayData.date.getDate() - dayData.date.getDay() + 6); 
      endOfWeek.setHours(0,0,0,0);
      
      const weekKey = formatDateKey(endOfWeek); // Saturday's date as key
      const weekIdForGoal = getWeekId(dayData.date); // ISO Week ID for goal matching

      if (!weekSummaries[weekKey]) {
        weekSummaries[weekKey] = {
          weekIdentifier: weekKey,
          totalProfit: 0,
          entryCount: 0,
          endDate: endOfWeek,
        };
        const weeklyGoal = goals.find(g => g.type === 'weekly' && g.appliesTo === weekIdForGoal);
        if (weeklyGoal) {
            weekSummaries[weekKey].goalProgress = { current: 0, goal: weeklyGoal.amount, percentage: 0 };
        }
      }
      weekSummaries[weekKey].totalProfit += dayData.profit;
      weekSummaries[weekKey].entryCount += 1;
      if (weekSummaries[weekKey].goalProgress) {
        weekSummaries[weekKey].goalProgress!.current += dayData.profit;
        weekSummaries[weekKey].goalProgress!.percentage = (weekSummaries[weekKey].goalProgress!.current / weekSummaries[weekKey].goalProgress!.goal) * 100;
      }
    }
  });
  
  const monthProgressPercentage = monthlyGoal ? (accumulatedMonthProfitForGoal / monthlyGoal.amount) * 100 : 0;

  return (
    <div className="bg-slate-800 p-3 sm:p-4 rounded-lg shadow-lg">
      <div className="grid grid-cols-7 gap-px text-center text-xs sm:text-sm font-medium text-slate-400 mb-2">
        {DAYS_OF_WEEK_PT_SHORT.map(day => (
          <div key={day} className="py-2">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {calendarDays.map((dayData) => {
          if (dayData.date.getDay() === 6) { // Saturday
            const weekKey = formatDateKey(dayData.date);
            const summary = weekSummaries[weekKey];
            return (
              <WeekSummaryTile
                key={`week-${weekKey}`}
                date={dayData.date}
                isCurrentMonth={dayData.isCurrentMonth}
                summaryData={summary}
                onClick={() => onDayClick(dayData.date, dayData.isCurrentMonth)}
                currency={currency}
              />
            );
          } else {
            return (
              <DayTile
                key={`day-${formatDateKey(dayData.date)}`}
                dayData={dayData}
                onClick={() => onDayClick(dayData.date, dayData.isCurrentMonth)}
                currency={currency}
                onShowDetails={onShowDetails}
              />
            );
          }
        })}
      </div>
      {monthlyGoal && (
        <div className="mt-4">
            <div className="flex justify-between text-sm text-slate-300 mb-1">
                <span>Meta Mensal ({formatCurrency(monthlyGoal.amount, currency)})</span>
                <span>{monthProgressPercentage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div 
                    className={`h-2.5 rounded-full ${monthProgressPercentage >= 100 ? 'bg-green-500' : 'bg-sky-600'}`}
                    style={{ width: `${Math.min(monthProgressPercentage, 100)}%` }}
                ></div>
            </div>
        </div>
      )}
    </div>
  );
};