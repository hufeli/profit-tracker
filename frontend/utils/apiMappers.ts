export interface ApiGoal {
  id: string;
  dashboard_id: string;
  type: 'daily' | 'weekly' | 'monthly';
  amount: number;
  applies_to: string;
}

import type { Goal } from '../types';

export function goalFromApi(apiGoal: ApiGoal): Goal {
  return {
    id: apiGoal.id,
    dashboard_id: apiGoal.dashboard_id,
    type: apiGoal.type,
    amount: apiGoal.amount,
    appliesTo: apiGoal.applies_to,
  };
}

export function goalToApi(goal: Goal): ApiGoal {
  return {
    id: goal.id,
    dashboard_id: goal.dashboard_id!,
    type: goal.type,
    amount: goal.amount,
    applies_to: goal.appliesTo,
  };
}
