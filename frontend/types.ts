
export type CurrencyCode = 'BRL' | 'USD' | 'EUR';

export interface DailyEntry {
  finalBalance: number;
  tags?: string[];
  notes?: string;
}

export interface Entries {
  [dateKey: string]: DailyEntry; // dateKey is "YYYY-MM-DD"
}

export interface CalculatedDayData {
  date: Date;
  profit?: number;
  entryExists: boolean;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayNumber: number;
  tags?: string[];
  notes?: string;
  goalProgress?: { current: number; goal: number; percentage: number };
  dynamicDailyTargetForWeek?: number | null;
  dynamicDailyTargetForMonth?: number | null;
}

export interface CalculatedWeekSummaryData {
  weekIdentifier: string; // e.g., "2024-W23"
  totalProfit: number;
  entryCount: number;
  endDate: Date; // The Saturday this summary belongs to
  goalProgress?: { current: number; goal: number; percentage: number };
}

export type GoalType = 'daily' | 'weekly' | 'monthly';

export interface Goal {
  id: string; // Unique ID for the goal
  dashboard_id?: string; // FK to dashboards table
  type: GoalType;
  amount: number;
  appliesTo: string; // For 'daily', 'YYYY-MM-DD'; for 'weekly', 'YYYY-WNN'; for 'monthly', 'YYYY-MM'
}

export interface AppSettings {
  // user_id is implicit via API calls
  dashboard_id?: string; // FK to dashboards table
  currency: CurrencyCode;
  enableNotifications: boolean;
  notificationTime: string; // HH:MM format
}

export interface ReportFilters {
  dateRange: ReportDateRange;
  compareDateRange?: ReportDateRange | null;
  tags: string[]; // Empty array means no tag filter
}

export type ReportDateRange = 'thisMonth' | 'last30days' | 'last90days' | 'thisYear' | 'allTime' | 'custom';

export interface CustomDateRange {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

export interface ReportSummaryStats {
  totalProfit: number;
  averageDailyProfit: number;
  positiveDays: number;
  negativeDays: number;
  neutralDays: number;
  tradingDays: number;
  winLossRatio?: number;
  avgGainPositiveDay?: number;
  avgLossNegativeDay?: number;
  maxProfitDay?: { date: string, amount: number };
  maxLossDay?: { date: string, amount: number };
  profitFactor?: number;
  performanceByDayOfWeek?: { day: string, profit: number }[];
}

export interface ProcessedReportData {
  date: string; // YYYY-MM-DD
  dayLabel: string; // DD/MM
  dailyProfit: number;
  cumulativeProfit: number;
  balance: number;
  tags?: string[];
  notes?: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string;
}

export interface SetupStatusResponse {
  isConfigured: boolean;
  message?: string;
  requiresManualEnvUpdate?: boolean; 
}

export interface Dashboard {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at?: string;
}
