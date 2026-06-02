import type { DungeonRun, ExerciseSet } from '@/types';

export function calcWorkoutXP(exercises: ExerciseSet[], durationMinutes: number): number {
  const volume = exercises.reduce((sum, e) => sum + e.sets * e.reps * e.weightKg, 0);
  const intensity = Math.min(2, durationMinutes / 45);
  const base = Math.round(50 + (volume / 1000) * 100 * intensity);
  return Math.min(200, Math.max(50, base));
}

export function calcDietXP(complianceScore: number): number {
  if (complianceScore >= 0.85) return 100;
  if (complianceScore >= 0.7) return 60;
  if (complianceScore >= 0.5) return 30;
  return 0;
}

export function calcQuestXP(xpReward: number): number {
  return xpReward;
}

export function calcStreakBonus(streakDays: number): number {
  if (streakDays === 7) return 250;
  if (streakDays === 30) return 500;
  if (streakDays === 90) return 1500;
  return 0;
}

export function getDungeonMultiplier(run: DungeonRun | null): number {
  if (!run || !run.xpMultiplierUntil) return 1;
  return Date.now() < run.xpMultiplierUntil ? 1.5 : 1;
}

export function calcMacroCompliance(
  totalProteinG: number,
  targetProteinG: number
): number {
  if (targetProteinG === 0) return 1;
  const ratio = totalProteinG / targetProteinG;
  return Math.min(1, ratio);
}
