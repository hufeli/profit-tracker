
import type { Goal, Entries, GoalType } from '../types';
import { formatDateKey, getPreviousBalanceForDate, getWeekId, getMonthId } from './dateUtils';

/**
 * Calculates the profit for a specific date.
 */
function calculateProfitForDate(dateKey: string, entries: Entries, initialBalance: number): number {
  const entry = entries[dateKey];
  if (!entry) {
    return 0;
  }
  const prevBalance = getPreviousBalanceForDate(dateKey, entries, initialBalance);
  return entry.finalBalance - prevBalance;
}

/**
 * Returns an array of working days (Mon-Fri by default) within a given date range.
 */
export function getWorkingDaysInRange(startDate: Date, endDate: Date, excludeWeekends: boolean = true): Date[] {
  const workingDays: Date[] = [];
  let currentDate = new Date(startDate);
  currentDate.setHours(0,0,0,0); // Normalize start date

  const finalEndDate = new Date(endDate);
  finalEndDate.setHours(23,59,59,999); // Normalize end date

  while (currentDate <= finalEndDate) {
    const dayOfWeek = currentDate.getDay();
    if (excludeWeekends) {
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Sunday, 6 = Saturday
        workingDays.push(new Date(currentDate));
      }
    } else {
      workingDays.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return workingDays;
}

/**
 * Gets the start and end date of a goal period.
 */
function getGoalPeriod(goal: Goal, referenceDate: Date): { periodStartDate: Date; periodEndDate: Date } | null {
  const year = parseInt(goal.appliesTo.substring(0, 4), 10);
  let periodStartDate: Date;
  let periodEndDate: Date;

  if (goal.type === 'weekly') {
    // YYYY-WNN format
    const weekNumber = parseInt(goal.appliesTo.substring(6), 10);
    // Calculate Monday of that week
    const firstDayOfYear = new Date(year, 0, 1);
    const daysOffset = (weekNumber - 1) * 7;
    periodStartDate = new Date(firstDayOfYear.setDate(firstDayOfYear.getDate() + daysOffset));
    while (periodStartDate.getDay() !== 1) { // 1 for Monday
      periodStartDate.setDate(periodStartDate.getDate() -1);
      if(periodStartDate.getFullYear() < year && weekNumber === 1) { // Handle week 1 starting in previous year
         periodStartDate = new Date(year, 0, 1);
         while(periodStartDate.getDay() !== 1) periodStartDate.setDate(periodStartDate.getDate() + 1);
         break;
      }
    }
     // Correct year if week starts in previous year but belongs to current year's week numbering
    if (periodStartDate.getFullYear() < year && weekNumber === 1) {
        const tempDate = new Date(year, 0, 1);
        while (tempDate.getDay() !== 1) {
            tempDate.setDate(tempDate.getDate() + 1);
        }
        // if tempDate is closer to Jan 1st of 'year' than periodStartDate, use tempDate
        if (Math.abs(tempDate.getTime() - new Date(year,0,1).getTime()) < Math.abs(periodStartDate.getTime() - new Date(year,0,1).getTime())) {
           periodStartDate = tempDate;
        }
    }


    periodEndDate = new Date(periodStartDate);
    periodEndDate.setDate(periodStartDate.getDate() + 6); // Sunday of that week
     // Ensure periodEndDate is not in the next year for the last week.
    if (periodEndDate.getFullYear() > year && weekNumber > 50) {
        periodEndDate = new Date(year, 11, 31);
    }


  } else if (goal.type === 'monthly') {
    // YYYY-MM format
    const month = parseInt(goal.appliesTo.substring(5, 7), 10) - 1; // Month is 0-indexed
    periodStartDate = new Date(year, month, 1);
    periodEndDate = new Date(year, month + 1, 0);
  } else {
    return null; // Daily goals are not handled by this dynamic calculation
  }
  periodStartDate.setHours(0,0,0,0);
  periodEndDate.setHours(23,59,59,999);
  return { periodStartDate, periodEndDate };
}


/**
 * Calculates the dynamic daily target needed to reach a weekly or monthly goal.
 * Returns null if not applicable (e.g., explicit daily goal exists, date outside period, etc.).
 */
export function calculateDynamicDailyTarget(
  goal: Goal,
  entries: Entries,
  initialBalance: number,
  forDate: Date,
  allGoals: Goal[]
): number | null {
  if (goal.type === 'daily') return null; // This function is for weekly/monthly dynamic targets

  const forDateNormalized = new Date(forDate);
  forDateNormalized.setHours(0,0,0,0);

  const dateKeyForCheck = formatDateKey(forDateNormalized);
  const explicitDailyGoalExists = allGoals.some(g => g.type === 'daily' && g.appliesTo === dateKeyForCheck);
  if (explicitDailyGoalExists) {
    return null; // Explicit daily goal takes precedence
  }

  const period = getGoalPeriod(goal, forDateNormalized);
  if (!period) return null;
  const { periodStartDate, periodEndDate } = period;

  if (forDateNormalized < periodStartDate || forDateNormalized > periodEndDate) {
    return null; // Date is outside the goal's period
  }

  let profitRealizadoNoPeriodoAteOntem = 0;
  let currentDateInLoop = new Date(periodStartDate);
  while (currentDateInLoop < forDateNormalized) {
    profitRealizadoNoPeriodoAteOntem += calculateProfitForDate(formatDateKey(currentDateInLoop), entries, initialBalance);
    currentDateInLoop.setDate(currentDateInLoop.getDate() + 1);
  }

  const lucroRestanteNecessario = goal.amount - profitRealizadoNoPeriodoAteOntem;

  if (lucroRestanteNecessario <= 0) {
    return 0; // Goal already met or exceeded for the period
  }

  const diasUteisRestantesNoPeriodo = getWorkingDaysInRange(forDateNormalized, periodEndDate, true);
  
  if (diasUteisRestantesNoPeriodo.length === 0) {
    // If today is the last working day (or past it) and goal not met, target is everything remaining for today.
    // If forDate is a non-working day and it's the last day of period, this might be tricky.
    // For simplicity, if no working days left, and goal not met, and today is a working day return remaining.
    const isForDateWorkingDay = forDateNormalized.getDay() !== 0 && forDateNormalized.getDay() !== 6;
    if (isForDateWorkingDay) {
        return lucroRestanteNecessario;
    }
    return null; // Or indicate it's impossible / too late if forDate is not a working day.
  }

  return lucroRestanteNecessario / diasUteisRestantesNoPeriodo.length;
}
