import type { MacroTargets } from '@/types';

export type DietPhaseKind = 'BULK' | 'CUT' | 'MAINTAIN';
export type CycleDayType = 'HIGH' | 'MODERATE' | 'LOW';

export interface MacroCyclePattern {
  days: CycleDayType[];
}

export interface DietPhase {
  id: string;
  userId: string;
  phase: DietPhaseKind;
  startDate: string;
  endDate: string | null;
  macroTargets: MacroTargets;
  cyclePattern: MacroCyclePattern;
  createdAt: number;
  updatedAt: number;
  syncedAt?: number;
}

export interface MealSuggestion {
  name: string;
  timeOfDay: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  ingredients: string[];
  prepMinutes: number;
}

export interface MealPlanResponse {
  dayType: CycleDayType;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  meals: MealSuggestion[];
  coachNote: string;
}
