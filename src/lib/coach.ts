import { z } from 'zod';
import type { WorkoutLog, UserProfile } from '@/types';

const OverloadRecSchema = z.object({
  exercise: z.string(),
  currentAvgKg: z.number(),
  recommendedKg: z.number(),
  rationale: z.string(),
});

const WeekAdjustmentSchema = z.object({
  exercise: z.string(),
  targetSets: z.number().int(),
  targetReps: z.string(),
  targetWeightKg: z.number(),
  rationale: z.string(),
});

const PeriodizationWeekSchema = z.object({
  week: z.number().int().min(1).max(4),
  focus: z.string(),
  adjustments: z.array(WeekAdjustmentSchema),
});

const CoachPlanSchema = z.object({
  summary: z.string(),
  weeks: z.array(PeriodizationWeekSchema).length(4),
  overloadRecs: z.array(OverloadRecSchema),
  recoveryNotes: z.string(),
});

export type CoachPlan = z.infer<typeof CoachPlanSchema>;
export type OverloadRec = z.infer<typeof OverloadRecSchema>;
export type PeriodizationWeek = z.infer<typeof PeriodizationWeekSchema>;

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export async function getPeriodizationPlan(
  logs: WorkoutLog[],
  profile: Pick<UserProfile, 'goal' | 'rank' | 'streakDays' | 'weakArea'>,
): Promise<CoachPlan> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/coach-periodize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON}`,
    },
    body: JSON.stringify({ logs, profile }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `coach-periodize failed: ${res.status}`);
  }

  const data = await res.json();
  return CoachPlanSchema.parse(data);
}
