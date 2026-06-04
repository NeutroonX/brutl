import type { MacroTargets } from '@/types';
import type { CycleDayType, DietPhase } from '@/types/diet-phase';

export const CYCLE_MULTIPLIERS: Record<CycleDayType, { carbs: number; fat: number; cal: number }> = {
  HIGH:     { carbs: 1.30, fat: 0.90, cal: 1.10 },
  MODERATE: { carbs: 1.00, fat: 1.00, cal: 1.00 },
  LOW:      { carbs: 0.55, fat: 1.15, cal: 0.92 },
};

export function getTodayCycleDayType(phase: DietPhase, date: Date = new Date()): CycleDayType {
  const { days } = phase.cyclePattern;
  if (!days.length) return 'MODERATE';

  // Parse start date as local midnight to avoid UTC offset shifting day index.
  const [y, m, d] = phase.startDate.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysSinceStart = Math.max(0, Math.floor((today.getTime() - start.getTime()) / msPerDay));
  return days[daysSinceStart % days.length];
}

export function getEffectiveMacros(phase: DietPhase, date: Date = new Date()): MacroTargets {
  const dayType = getTodayCycleDayType(phase, date);
  const m = CYCLE_MULTIPLIERS[dayType];
  const base = phase.macroTargets;
  return {
    calories: Math.round(base.calories * m.cal),
    proteinG: base.proteinG,
    carbsG:   Math.round(base.carbsG * m.carbs),
    fatG:     Math.round(base.fatG * m.fat),
  };
}
